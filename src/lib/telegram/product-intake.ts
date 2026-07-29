import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { uploadImageAdmin } from "@/lib/firebase/admin-storage";
import { buildNameTokens } from "@/lib/search/tokens";
import { registerFacets } from "@/lib/products/facets";
import { sendChatMessage, downloadTelegramFile } from "./bot";
import { announceProduct } from "./channel";
import { logAction } from "./action-log";
import { startOptionalFieldsFlow } from "./admin-session";
import { INTAKE_FIELD_LABELS, INTAKE_TEMPLATE, parseIntakeCaption } from "./intake-parser";
import type { Product } from "@/types/product";
import type { StockIntake } from "@/types/intake";

/**
 * "KIRIM" TOPIC'i — Telegramdan tez mahsulot qo'shish.
 *
 * Admin guruhning kirim topic'iga rasm(lar) + izoh tashlaydi:
 *
 *   PPR quvur 25mm
 *   Narxi: 45000
 *   Soni: 120
 *   Kimdan: Akmal aka
 *   Material: polipropilen
 *
 * Majburiy: kamida 1 ta rasm, nom, narx, soni, kimdan kelgani, materiali.
 * Hammasi joyida bo'lsa mahsulot darhol katalogga tushadi va bot
 * "qolgan ma'lumotlarni to'ldirasizmi?" deb tugmali savol beradi
 * (kategoriya, brend, davlat, tavsif, chegirma... - ixtiyoriy).
 *
 * ALBOM (media group) nozikligi: Telegram albomdagi har bir rasmni
 * ALOHIDA update qilib yuboradi va izoh faqat bittasida bo'ladi.
 * Shuning uchun albom holati `intakeAlbums/{mediaGroupId}` hujjatida
 * saqlanadi: izohli xabar mahsulotni yaratadi, qolgan rasmlar esa
 * (qaysi tartibda kelishidan qat'i nazar) o'sha mahsulotga qo'shiladi.
 */

const MAX_IMAGES = 10;
/** Albom hujjati shuncha vaqtdan keyin keraksiz - tozalash uchun belgi. */
const ALBUM_TTL_MS = 60 * 60 * 1000;

interface AlbumDoc {
  productId?: string;
  /** Izohli xabardan oldin kelgan rasmlar. */
  pendingPhotos?: string[];
  /** Izoh xato bo'lsa - albomning qolgan rasmlari e'tiborsiz qoladi. */
  rejected?: boolean;
  createdAt: number;
}

function albumRef(mediaGroupId: string) {
  return getAdminDb().collection("intakeAlbums").doc(mediaGroupId);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

/** Telegram rasmini Storage'ga yuklab, mahsulot rasmiga qo'shadi. */
async function attachPhoto(productId: string, fileId: string): Promise<void> {
  const file = await downloadTelegramFile(fileId);
  const url = await uploadImageAdmin(`products/${productId}`, {
    buffer: file.buffer,
    contentType: file.contentType,
    originalName: file.fileName,
  });

  // Albom rasmlari parallel kelishi mumkin - massivni tranzaksiyada
  // yangilaymiz, aks holda oxirgi yozuv oldingilarini o'chirib yuboradi.
  const ref = getAdminDb().collection("products").doc(productId);
  await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const data = snap.data() as Product;
    const images = [...(data.images ?? [])];
    if (images.includes(url) || images.length >= MAX_IMAGES) return;
    images.push(url);
    tx.update(ref, {
      images,
      thumbnailUrl: data.thumbnailUrl || url,
      updatedAt: Date.now(),
    });
  });
}

/** Kirim tarixiga yozuv (sayt: /admin/katalog/kirim/tarix). */
async function recordIntakeHistory(product: Product, userId: number, adminName: string): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection("stockIntakes").doc();
  const intake: StockIntake = {
    id: ref.id,
    adminUid: `tg:${userId}`,
    adminEmail: adminName || null,
    items: [
      {
        productId: product.id,
        name: product.name,
        qty: product.stock,
        stockBefore: 0,
        price: product.price,
        supplier: product.supplier ?? null,
      },
    ],
    totalQty: product.stock,
    createdAt: Date.now(),
  };
  await ref.set(intake);
}

export interface IntakeMessageParams {
  chatId: number;
  threadId?: number;
  userId: number;
  /** Xabar muallifi (kirim tarixida ko'rinadi). */
  authorName?: string;
  caption?: string;
  /** Xabardagi eng katta o'lchamdagi rasm. */
  photoFileId?: string;
  mediaGroupId?: string;
}

/**
 * Kirim topic'iga tushgan xabarni qayta ishlaydi.
 * `true` - xabar shu oqimga tegishli edi (boshqa handler chaqirilmaydi).
 */
export async function handleIntakeMessage(params: IntakeMessageParams): Promise<boolean> {
  const { chatId, threadId, userId, caption, photoFileId, mediaGroupId } = params;

  // 1) Rasmsiz xabar - eslatma (albom holati buzilmasin uchun faqat
  //    izohli yoki yolg'iz xabarlarga javob beramiz).
  if (!photoFileId) {
    await sendChatMessage(
      chatId,
      [
        "🖼 Kirim uchun kamida <b>1 ta rasm</b> kerak.",
        "",
        "Rasm(lar)ni tashlab, izohiga quyidagicha yozing:",
        `<pre>${escapeHtml(INTAKE_TEMPLATE)}</pre>`,
      ].join("\n"),
      { threadId }
    );
    return true;
  }

  // 2) Izohsiz albom rasmi - mahsulot allaqachon yaratilgan bo'lsa
  //    unga qo'shamiz, hali yaratilmagan bo'lsa navbatga qo'yamiz.
  if (!caption?.trim()) {
    if (!mediaGroupId) {
      await sendChatMessage(
        chatId,
        [
          "ℹ️ Rasm izohsiz kelgani uchun mahsulot yaratilmadi.",
          "",
          "Rasm izohiga quyidagilarni yozing:",
          `<pre>${escapeHtml(INTAKE_TEMPLATE)}</pre>`,
        ].join("\n"),
        { threadId }
      );
      return true;
    }

    const ref = albumRef(mediaGroupId);
    const snap = await ref.get();
    const album = snap.data() as AlbumDoc | undefined;

    if (album?.rejected) return true;
    if (album?.productId) {
      await attachPhoto(album.productId, photoFileId).catch((error) =>
        console.error("Albom rasmini qo'shishda xato:", error)
      );
      return true;
    }

    await ref.set(
      {
        pendingPhotos: FieldValue.arrayUnion(photoFileId),
        createdAt: album?.createdAt ?? Date.now(),
      },
      { merge: true }
    );
    return true;
  }

  // 3) Izohli xabar - mahsulotni yaratamiz.
  const parsed = parseIntakeCaption(caption);

  if (parsed.missing.length > 0) {
    if (mediaGroupId) {
      await albumRef(mediaGroupId).set({ rejected: true, createdAt: Date.now() }, { merge: true });
    }
    await sendChatMessage(
      chatId,
      [
        "⚠️ <b>Mahsulot qo'shilmadi.</b> Quyidagilar yetishmayapti:",
        ...parsed.missing.map((field) => `• ${INTAKE_FIELD_LABELS[field]}`),
        "",
        "Namuna:",
        `<pre>${escapeHtml(INTAKE_TEMPLATE)}</pre>`,
        "Rasmni izohi bilan qaytadan tashlang.",
      ].join("\n"),
      { threadId }
    );
    return true;
  }

  const db = getAdminDb();
  const now = Date.now();
  const ref = db.collection("products").doc();
  const product: Product = {
    id: ref.id,
    slug: `${parsed.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")}-${ref.id.slice(0, 6)}`,
    name: parsed.name,
    nameSearchIndex: parsed.name.toLowerCase(),
    nameTokens: buildNameTokens(parsed.name, parsed.brand),
    description: parsed.description,
    category: parsed.category,
    brand: parsed.brand,
    manufacturerCountry: parsed.manufacturerCountry,
    supplier: parsed.supplier,
    material: parsed.material!,
    dimensions: {
      ...(parsed.diameterMm !== null ? { diameterMm: parsed.diameterMm } : {}),
      ...(parsed.lengthMm !== null ? { lengthMm: parsed.lengthMm } : {}),
      ...(parsed.weightKg !== null ? { weightKg: parsed.weightKg } : {}),
    },
    price: parsed.price!,
    discountPrice: parsed.discountPrice,
    discountUntil: parsed.discountUntil,
    currency: "UZS",
    stock: parsed.stock!,
    images: [],
    thumbnailUrl: "",
    isActive: true,
    salesCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(product);

  // Albom: shu xabarning rasmi + oldinroq kelgan rasmlar.
  let pendingPhotos: string[] = [];
  if (mediaGroupId) {
    const albumSnap = await albumRef(mediaGroupId).get();
    pendingPhotos = (albumSnap.data() as AlbumDoc | undefined)?.pendingPhotos ?? [];
    await albumRef(mediaGroupId).set(
      { productId: ref.id, pendingPhotos: [], createdAt: Date.now() },
      { merge: true }
    );
  }

  let photoError = false;
  for (const fileId of [photoFileId, ...pendingPhotos].slice(0, MAX_IMAGES)) {
    try {
      await attachPhoto(ref.id, fileId);
    } catch (error) {
      photoError = true;
      console.error("Kirim rasmini yuklashda xato:", error);
    }
  }

  await Promise.all([
    registerFacets({
      brand: parsed.brand,
      country: parsed.manufacturerCountry,
      supplier: parsed.supplier,
    }),
    recordIntakeHistory(product, userId, params.authorName ?? "").catch((error) =>
      console.error("Kirim tarixini yozishda xato:", error)
    ),
    logAction(
      `📥 Telegram kirim: ${parsed.name} — ${parsed.stock} dona, ${formatSom(parsed.price!)} (${parsed.supplier})`
    ),
  ]);

  // Kanalga e'lon - rasmlar biriktirilgandan keyingi holat bilan.
  const fresh = await ref.get();
  const saved = { id: fresh.id, ...fresh.data() } as Product;
  await announceProduct(saved, "new").catch((error) =>
    console.error("Kanalga e'lon (kirim) xatosi:", error)
  );

  const summary = [
    `✅ <b>Katalogga qo'shildi:</b> ${escapeHtml(saved.name)}`,
    `ID: <code>${saved.id}</code>`,
    `💰 ${formatSom(saved.price)} | 📦 ${saved.stock} dona`,
    `🚚 Kimdan: ${escapeHtml(saved.supplier ?? "")}`,
    `🖼 Rasm: ${saved.images.length} ta${photoError ? " (ba'zi rasmlar yuklanmadi)" : ""}`,
    parsed.categoryGuessed ? "🏷 Kategoriya nomdan taxmin qilindi — kerak bo'lsa tugmadan o'zgartiring." : "",
    ...parsed.warnings.map((warning) => `⚠️ ${warning}`),
  ]
    .filter(Boolean)
    .join("\n");

  await startOptionalFieldsFlow({
    chatId,
    threadId,
    userId,
    product: saved,
    header: summary,
  });

  // Eski albom hujjatlarini tozalab turamiz (fon rejimida, xatosiz).
  void cleanupOldAlbums();
  return true;
}

/** 1 soatdan eski albom hujjatlari keraksiz - o'chirib turamiz. */
async function cleanupOldAlbums(): Promise<void> {
  try {
    const stale = await getAdminDb()
      .collection("intakeAlbums")
      .where("createdAt", "<", Date.now() - ALBUM_TTL_MS)
      .limit(20)
      .get();
    await Promise.all(stale.docs.map((doc) => doc.ref.delete()));
  } catch {
    // Indeks yo'q bo'lsa ham asosiy oqimga ta'sir qilmaydi.
  }
}
