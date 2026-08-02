import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { recordStockMoves } from "@/lib/inventory/stock-moves";
import { logAction } from "@/lib/telegram/action-log";
import { sendPushToUser } from "@/lib/notifications/push";
import { isSmsConfigured, sendSms } from "@/lib/sms/sender";
import type { Order } from "@/types/order";

export const runtime = "nodejs";

const schema = z.object({
  /** Qaytarilayotgan qatorlar. Bo'sh bo'lsa - butun buyurtma qaytadi. */
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().max(300).nullable().optional(),
        quantity: z.number().int().positive(),
      })
    )
    .max(50)
    .optional(),
  reason: z.string().max(300).default(""),
});

/**
 * QAYTARISH / ALMASHTIRISH.
 *
 * Bekor qilish (`cancelled`) — buyurtma hali yetkazilmagan holat uchun.
 * Bu route esa ALLAQACHON berilgan (yoki yakunlangan) buyurtmadan
 * mahsulot qaytganda ishlatiladi: zaxira qaytariladi, tushum va sotuv
 * soni kamayadi, ombor jurnaliga "qaytish" yozuvi tushadi va mijozga
 * xabar boradi. Qisman qaytarish ham mumkin (faqat kerakli qatorlar).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("orders", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const { id } = await params;
  const db = getAdminDb();
  const orderRef = db.collection("orders").doc(id);
  const snap = await orderRef.get();
  if (!snap.exists) return NextResponse.json({ error: "Buyurtma topilmadi." }, { status: 404 });

  const order = snap.data() as Order;
  const requested = parsed.data.items?.length
    ? parsed.data.items
    : order.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
      }));

  // Har bir qator buyurtmada bor-yo'qligi va miqdori tekshiriladi:
  // buyurtmadagidan ko'p qaytarib bo'lmaydi.
  const alreadyReturned = order.returnedItems ?? [];
  const lines: { productId: string; variantId: string | null; quantity: number; price: number; name: string }[] = [];

  for (const line of requested) {
    const item = order.items.find(
      (row) => row.productId === line.productId && (row.variantId ?? null) === (line.variantId ?? null)
    );
    if (!item) {
      return NextResponse.json({ error: "Bu mahsulot buyurtmada yo'q." }, { status: 400 });
    }
    const returnedBefore = alreadyReturned
      .filter((row) => row.productId === line.productId && (row.variantId ?? null) === (line.variantId ?? null))
      .reduce((sum, row) => sum + row.quantity, 0);
    if (returnedBefore + line.quantity > item.quantity) {
      return NextResponse.json(
        { error: `"${item.name}" bo'yicha ${item.quantity - returnedBefore} tadan ko'pini qaytarib bo'lmaydi.` },
        { status: 400 }
      );
    }
    lines.push({
      productId: line.productId,
      variantId: line.variantId ?? null,
      quantity: line.quantity,
      price: item.price,
      name: item.name,
    });
  }

  const refundAmount = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const now = Date.now();

  // Zaxira va statistika.
  const batch = db.batch();
  for (const line of lines) {
    batch.update(db.collection("products").doc(line.productId), {
      stock: FieldValue.increment(line.quantity),
      salesCount: FieldValue.increment(-line.quantity),
    });
  }
  batch.set(
    db.collection("stats").doc("summary"),
    { totalRevenue: FieldValue.increment(-refundAmount) },
    { merge: true }
  );
  batch.update(orderRef, {
    returnedItems: [
      ...alreadyReturned,
      ...lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        price: line.price,
        returnedAt: now,
      })),
    ],
    refundAmount: (order.refundAmount ?? 0) + refundAmount,
    returnReason: parsed.data.reason.trim() || order.returnReason || null,
    updatedAt: now,
  });
  await batch.commit();

  await recordStockMoves(
    lines.map((line) => ({
      productId: line.productId,
      productName: line.name,
      variantId: line.variantId,
      type: "return" as const,
      qty: line.quantity,
      stockBefore: 0,
      stockAfter: 0,
      refId: id,
      note: parsed.data.reason.trim() || "Mijoz qaytardi",
      adminUid: admin.uid,
      adminName: admin.displayName ?? admin.email ?? null,
    }))
  );

  await logAction(
    `↩️ Qaytarish (${admin.email ?? "admin"}): #${id.slice(0, 8)} — ${lines.length} qator, ${refundAmount.toLocaleString("uz-UZ")} so'm`
  );

  // Mijozga xabar - push va SMS (sozlangan bo'lsa).
  if (order.userId) {
    await sendPushToUser(order.userId, {
      title: `Buyurtma #${id.slice(0, 8)}`,
      body: `Qaytarish qabul qilindi: ${refundAmount.toLocaleString("uz-UZ")} so'm`,
      data: { screen: "Buyurtmalarim", orderId: id },
    });
  }
  if (isSmsConfigured() && order.phoneNumber) {
    await sendSms(
      order.phoneNumber,
      `Atoyo: buyurtma #${id.slice(0, 8)} bo'yicha qaytarish qabul qilindi. Summa: ${refundAmount.toLocaleString("uz-UZ")} so'm`
    );
  }

  return NextResponse.json({ ok: true, refundAmount });
}
