import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendTopicMessage } from "@/lib/telegram/bot";
import { formatOrderMessage } from "@/lib/telegram/templates";
import { buildOrderActionKeyboard } from "@/lib/telegram/keyboard";
import { isDiscountActive } from "@/lib/products/pricing";
import { hasVariants, variantLabel, variantPrice } from "@/lib/products/variants";
import {
  PROMO_ERROR_MESSAGES,
  deliveryFeeFor,
  normalizePromoCode,
  validatePromo,
} from "@/lib/orders/promo";
import { getDeliverySettings } from "@/lib/orders/pricing";
import type { Product, ProductVariant } from "@/types/product";
import type { Order, OrderItem, OrderLocation } from "@/types/order";
import type { PromoCode } from "@/types/promo";
import { recordStockMoves } from "@/lib/inventory/stock-moves";

/** Buyurtmani qabul qilib bo'lmasa (zaxira yetmasa, mahsulot yo'q) - mijozga
 *  tushunarli sabab qaytarish uchun alohida xato turi. */
export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

export interface NewOrderInput {
  customerName: string;
  phoneNumber: string;
  items: OrderItem[];
  location?: OrderLocation | null;
  deliveryAddress?: string | null;
  paymentMethod?: "cash" | "online";
  userId?: string | null;
  customerEmail?: string | null;
  /** Mijoz kiritgan promokod (ixtiyoriy) - serverda qayta tekshiriladi. */
  promoCode?: string | null;
  /** Buyurtma Telegram botdan kelgan bo'lsa - mijozning chat ID'si. */
  customerChatId?: number | null;
}

/**
 * Buyurtma yaratishning YAGONA yo'li - sayt (/api/orders) ham, Telegram
 * bot ham shu funksiyani chaqiradi, shunda zaxira/statistika/xabar
 * mantiqlari hech qachon bir-biridan chetga chiqmaydi.
 *
 * Qiladi: buyurtmani saqlaydi, zaxira/salesCount/stats ni atomik batch'da
 * yangilaydi, guruhning #Buyurtmalar topic'iga tugmali xabar yuboradi.
 * Telegram yuborilmasa buyurtma baribir saqlangan bo'ladi (best-effort).
 */
export async function createOrder(input: NewOrderInput): Promise<Order> {
  const db = getAdminDb();
  const now = Date.now();
  const paymentMethod = input.paymentMethod ?? "cash";
  const orderRef = db.collection("orders").doc();

  // ---- Narx va zaxira SERVERDA tekshiriladi ----
  // Client yuborgan narxga ishonilmaydi: har bir mahsulot bazadan qayta
  // o'qiladi, hozirgi haqiqiy narx olinadi va zaxira yetarliligi
  // tekshiriladi. Hammasi bitta tranzaksiyada - ikki mijoz oxirgi donani
  // bir vaqtda olib ketolmaydi.
  const deliverySettings = await getDeliverySettings();
  const promoRef = input.promoCode
    ? db.doc(`promoCodes/${normalizePromoCode(input.promoCode)}`)
    : null;

  /** Tranzaksiya davomida yig'iladi, muvaffaqiyatdan keyin yoziladi. */
  const stockMoves: Parameters<typeof recordStockMoves>[0] = [];

  const totals = await db.runTransaction(async (tx) => {
    const refs = input.items.map((i) => db.collection("products").doc(i.productId));
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    const promoSnap = promoRef ? await tx.get(promoRef) : null;

    const verifiedItems: OrderItem[] = [];
    // Ombor tarixi tranzaksiyadan KEYIN yoziladi (tranzaksiya ichida
    // qo'shimcha yozuv qilmaymiz - u qayta urinishda takrorlanishi mumkin).
    stockMoves.length = 0;
    /** Turlari bo'lgan mahsulotlarda zaxira massiv ichida - shu yerda yig'iladi. */
    const variantUpdates = new Map<string, ProductVariant[]>();

    for (let i = 0; i < input.items.length; i += 1) {
      const requested = input.items[i]!;
      const snap = snaps[i]!;
      if (!snap.exists) {
        throw new OrderValidationError(`"${requested.name}" mahsuloti topilmadi.`);
      }
      const product = { id: snap.id, ...snap.data() } as Product;
      if (!product.isActive || product.isDraft) {
        throw new OrderValidationError(`"${product.name}" hozir sotuvda yo'q.`);
      }

      // ---- Turlari bo'lgan mahsulot: narx va zaxira TANLANGAN TURdan ----
      if (hasVariants(product)) {
        const variants = variantUpdates.get(product.id) ?? [...(product.variants ?? [])];
        const index = variants.findIndex((v) => v.id === requested.variantId);
        if (index < 0) {
          throw new OrderValidationError(`"${product.name}" uchun turini tanlang.`);
        }
        const variant = variants[index]!;
        if (variant.stock < requested.quantity) {
          throw new OrderValidationError(
            `"${product.name}" (${variantLabel(product, variant)}) zaxirasi yetarli emas (mavjud: ${variant.stock}).`
          );
        }
        variants[index] = { ...variant, stock: variant.stock - requested.quantity };
        variantUpdates.set(product.id, variants);

        verifiedItems.push({
          productId: product.id,
          variantId: variant.id,
          variantLabel: variantLabel(product, variant),
          name: product.name,
          price: variantPrice(variant),
          // Foyda hisoboti uchun tannarx nusxasi (turning o'ziniki
          // bo'lmasa - mahsulotniki).
          costPrice: variant.costPrice ?? product.costPrice ?? null,
          quantity: requested.quantity,
          thumbnailUrl: product.thumbnailUrl,
        });
        continue;
      }

      if (product.stock < requested.quantity) {
        throw new OrderValidationError(
          `"${product.name}" zaxirasi yetarli emas (mavjud: ${product.stock} dona).`
        );
      }
      verifiedItems.push({
        productId: product.id,
        name: product.name,
        // Narx MIJOZDAN emas, bazadan - chegirma muddati ham tekshiriladi.
        price: isDiscountActive(product) ? product.discountPrice! : product.price,
        costPrice: product.costPrice ?? null,
        quantity: requested.quantity,
        thumbnailUrl: product.thumbnailUrl,
      });
    }

    const itemsTotal = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // ---- Promokod ham SERVERDA tekshiriladi ----
    // Kod mavjudligi, muddati, limiti va minimal summa shu tranzaksiyada
    // qayta o'qiladi: limitdan oshib ketish imkoni qolmaydi.
    let discount = 0;
    let appliedPromo: string | null = null;
    if (promoSnap) {
      const promo = promoSnap.exists ? ({ ...promoSnap.data(), code: promoSnap.id } as PromoCode) : null;
      const result = validatePromo(promo, itemsTotal, now);
      if (!result.ok) throw new OrderValidationError(PROMO_ERROR_MESSAGES[result.error]);
      discount = result.discount;
      appliedPromo = promoSnap.id;
    }

    const payable = itemsTotal - discount;
    const delivery = deliveryFeeFor(deliverySettings, payable);
    const total = payable + delivery;

    // Zaxira/salesCount va statistika - shu tranzaksiyada.
    //
    // Bitta mahsulotning bir nechta turi buyurtmada bo'lishi mumkin,
    // shuning uchun avval mahsulot bo'yicha yig'ib, keyin har biriga
    // BITTA yozuv qilamiz (massiv ikki marta yozilib qolmasin).
    const perProduct = new Map<string, { ref: (typeof refs)[number]; qty: number }>();
    for (let i = 0; i < verifiedItems.length; i += 1) {
      const item = verifiedItems[i]!;
      const entry = perProduct.get(item.productId) ?? { ref: refs[i]!, qty: 0 };
      entry.qty += item.quantity;
      perProduct.set(item.productId, entry);
    }

    for (const [productId, entry] of perProduct) {
      const snap = snaps.find((doc) => doc.id === productId);
      const data = snap?.data() as { name?: string; stock?: number; code?: number } | undefined;
      stockMoves.push({
        productId,
        productName: data?.name ?? productId,
        productCode: data?.code ?? null,
        type: "sale" as const,
        qty: -entry.qty,
        stockBefore: data?.stock ?? 0,
        stockAfter: (data?.stock ?? 0) - entry.qty,
        refId: orderRef.id,
      });
      const updates: Record<string, unknown> = {
        stock: FieldValue.increment(-entry.qty),
        salesCount: FieldValue.increment(entry.qty),
      };
      // Turlari bo'lsa - o'sha turning zaxirasi ham kamayadi (Firestore
      // massiv ichida increment qilolmaydi, lekin massivni shu
      // tranzaksiyada o'qiganmiz - to'liq qayta yozamiz).
      const variants = variantUpdates.get(productId);
      if (variants) updates.variants = variants;
      tx.update(entry.ref, updates);
    }
    if (promoRef && appliedPromo) {
      tx.update(promoRef, { usedCount: FieldValue.increment(1), updatedAt: now });
    }
    tx.set(
      db.collection("stats").doc("summary"),
      { totalOrders: FieldValue.increment(1), totalRevenue: FieldValue.increment(total) },
      { merge: true }
    );

    return {
      items: verifiedItems,
      subtotal: itemsTotal,
      discountAmount: discount,
      deliveryFee: delivery,
      totalAmount: total,
      promoCode: appliedPromo,
    };
  });

  await recordStockMoves(stockMoves);

  const { items, subtotal, discountAmount, deliveryFee, totalAmount, promoCode } = totals;

  const order: Order = {
    id: orderRef.id,
    userId: input.userId ?? null,
    customerEmail: input.customerEmail ?? null,
    customerName: input.customerName,
    phoneNumber: input.phoneNumber,
    items,
    subtotal,
    promoCode,
    discountAmount,
    deliveryFee,
    totalAmount,
    currency: "UZS",
    location: input.location ?? null,
    deliveryAddress: input.deliveryAddress ?? null,
    paymentMethod,
    paymentStatus: paymentMethod === "online" ? "pending" : "not_required",
    status: "pending",
    stockReturned: false,
    telegramMessageId: null,
    customerChatId: input.customerChatId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  // Zaxira/statistika yuqoridagi tranzaksiyada allaqachon yangilangan.
  await orderRef.set(order);

  try {
    const sent = await sendTopicMessage("orders", formatOrderMessage(order), buildOrderActionKeyboard(order.id));
    await orderRef.update({ telegramMessageId: sent.message_id });
    order.telegramMessageId = sent.message_id;
  } catch (error) {
    console.error("Buyurtma xabarini Telegramga yuborishda xato:", error);
  }

  return order;
}
