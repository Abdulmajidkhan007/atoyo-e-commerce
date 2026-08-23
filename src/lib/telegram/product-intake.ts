import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { uploadImageAdmin, uploadVideoAdmin } from "@/lib/firebase/admin-storage";
import { buildNameTokens } from "@/lib/search/tokens";
import { registerFacets } from "@/lib/products/facets";
import { sendChatMessage, downloadTelegramFile, sendTopicMessage } from "./bot";
import { announceProduct } from "./channel";
import { logAction } from "./action-log";
import { startOptionalFieldsFlow } from "./admin-session";
import {
  INTAKE_FIELD_LABELS,
  INTAKE_TEMPLATE,
  INTAKE_MULTI_AXIS_TEMPLATE,
  INTAKE_VARIANT_TEMPLATE,
  parseIntakeCaption,
  guessCategory,
} from "./intake-parser";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { nextProductCode } from "@/lib/products/product-code";
import { labelOf, suggestTaxonomy } from "@/lib/products/taxonomy";
import { axisKeyOf, variantIdOf } from "@/lib/products/variants";
import type { Product, ProductVariant, VariantAxis } from "@/types/product";
import type { StockIntake } from "@/types/intake";
import { formatSom } from "@/lib/format";
import { escapeHtml } from "./html";

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
 * Majburiy: kamida 1 ta rasm, nom, narx, soni, kimdan kelgani,
 * kategoriya va sotish turi. Material MAJBURIY EMAS (narxnomalarda
 * ko'rsatilmaydi) - yozilsa qabul qilinadi.
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
const MAX_VIDEOS = 3;
/** Albom hujjati shuncha vaqtdan keyin keraksiz - tozalash uchun belgi. */
const ALBUM_TTL_MS = 60 * 60 * 1000;
/**
 * Albomdagi rasmlar Telegramdan alohida-alohida (odatda 1 soniya ichida)
 * keladi. Kanalga e'lon HAMMASI kelgandan keyin ketishi kerak, aks holda
 * postda bitta rasm qolib ketadi. Shuning uchun oxirgi rasmdan keyin
 * shuncha kutamiz va faqat eng oxirgi chaqiruv e'lon qiladi.
 */
const ALBUM_SETTLE_MS = 2500;

/** Kirimda kelgan fayl: rasm yoki video. */
export interface IntakeMedia {
  fileId: string;
  kind: "photo" | "video";
}

interface AlbumDoc {
  productId?: string;
  /** Hali biriktirilmagan fayllar navbati (tartibi saqlanadi). */
  pendingMedia?: IntakeMedia[];
  /** Izoh xato bo'lsa - albomning qolgan rasmlari e'tiborsiz qoladi. */
  rejected?: boolean;
  /** Oxirgi rasm qachon biriktirilgani (e'lonni kutish uchun). */
  lastPhotoAt?: number;
  /** E'lon yuborilganmi (bir albom - bitta e'lon). */
  announced?: boolean;
  createdAt: number;
}

function albumRef(mediaGroupId: string) {
  return getAdminDb().collection("intakeAlbums").doc(mediaGroupId);
}

/**
 * Telegram media faylini (rasm yoki video) Storage'ga yuklab,
 * mahsulotga qo'shadi.
 *
 * Albom fayllari parallel kelgani uchun massiv TRANZAKSIYADA
 * yangilanadi - aks holda oxirgi yozuv oldingilarini o'chirib yuboradi.
 */
async function attachMedia(productId: string, media: IntakeMedia): Promise<void> {
  const file = await downloadTelegramFile(media.fileId);
  const isVideo = media.kind === "video";
  const url = isVideo
    ? await uploadVideoAdmin(`products/${productId}`, {
        buffer: file.buffer,
        // Telegram video fayl yo'li .mp4 bo'ladi; getFile turini bermaydi.
        contentType: "video/mp4",
        originalName: file.fileName.replace(/\.[^.]+$/, ".mp4"),
      })
    : await uploadImageAdmin(`products/${productId}`, {
        buffer: file.buffer,
        contentType: file.contentType,
        originalName: file.fileName,
      });

  const ref = getAdminDb().collection("products").doc(productId);
  await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const data = snap.data() as Product;

    if (isVideo) {
      const videos = [...(data.videos ?? [])];
      if (videos.includes(url) || videos.length >= MAX_VIDEOS) return;
      videos.push(url);
      tx.update(ref, { videos, updatedAt: Date.now() });
      return;
    }

    const images = [...(data.images ?? [])];
    if (images.includes(url) || images.length >= MAX_IMAGES) return;
    images.push(url);
    tx.update(ref, { images, thumbnailUrl: data.thumbnailUrl || url, updatedAt: Date.now() });
  });
}

/**
 * Albom navbatini bo'shatadi.
 *
 * Telegram albom fayllarini alohida so'rov qilib yuboradi va ular
 * mahsulot yaratilishidan OLDIN ham kelishi mumkin. Shuning uchun har
 * bir fayl avval navbatga (`pendingMedia`) yoziladi, mahsulot tayyor
 * bo'lgach esa istalgan chaqiruv navbatni bo'shatadi: tranzaksiyada
 * bittasini olib chiqadi va biriktiradi - shunda har fayl aniq bir
 * marta qo'shiladi va hech biri yo'qolmaydi.
 */
async function drainPendingMedia(mediaGroupId: string, productId: string): Promise<void> {
  const ref = albumRef(mediaGroupId);

  for (let guard = 0; guard < MAX_IMAGES + MAX_VIDEOS + 2; guard += 1) {
    const next = await getAdminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const queue = ((snap.data() as AlbumDoc | undefined)?.pendingMedia ?? []) as IntakeMedia[];
      if (queue.length === 0) return null;
      const [first, ...rest] = queue;
      tx.set(ref, { pendingMedia: rest }, { merge: true });
      return first ?? null;
    });
    if (!next) return;

    try {
      await attachMedia(productId, next);
    } catch (error) {
      console.error("Albom faylini biriktirishda xato:", error);
    }
  }
}

/**
 * Albom tugashini kutib, kanalga e'lon qiladi.
 *
 * Har bir albom rasmi alohida webhook chaqiruvi bo'lgani uchun bu
 * funksiya bir necha marta parallel ishga tushadi: har biri kutadi va
 * o'zidan keyin yangi rasm kelgan bo'lsa - jim chekinadi. E'lonni
 * "band qilish" tranzaksiyada bo'ladi, ya'ni e'lon aniq bir marta ketadi.
 */
async function announceWhenAlbumSettles(mediaGroupId: string, productId: string): Promise<void> {
  const ref = albumRef(mediaGroupId);
  await ref.set({ productId, lastPhotoAt: Date.now(), createdAt: Date.now() }, { merge: true });
  await new Promise((resolve) => setTimeout(resolve, ALBUM_SETTLE_MS));

  const db = getAdminDb();
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as AlbumDoc | undefined;
    if (!data || data.announced) return false;
    // Kutish oralig'ida yangi rasm kelgan bo'lsa - e'lonni o'sha chaqiruv qiladi.
    if (Date.now() - (data.lastPhotoAt ?? 0) < ALBUM_SETTLE_MS - 300) return false;
    tx.set(ref, { announced: true }, { merge: true });
    return true;
  });
  if (!claimed) return;

  // Kutish oralig'ida navbatda qolgan fayllar bo'lsa - avval ularni
  // biriktiramiz, shundagina e'lon to'liq albom bilan chiqadi.
  await drainPendingMedia(mediaGroupId, productId);

  // Mahsulot chernovik bo'lsa e'lon chiqmaydi (announceProduct o'zi
  // o'tkazib yuboradi) - u "✅ Yetarli, tayyor" bosilganda chiqadi.
  const snap = await db.collection("products").doc(productId).get();
  if (!snap.exists) return;
  const result = await announceProduct(
    { id: snap.id, ...snap.data() } as Product,
    "new"
  ).catch((error) => {
    console.error("Kanalga e'lon (albom) xatosi:", error);
    return "skipped" as const;
  });
  // Tezlik chegarasiga urilgan bo'lsa xodim buni BILISHI kerak -
  // aks holda "post chiqmadi, nimadir buzuq" degan taassurot qoladi.
  if (result === "queued") await notifyQueued(snap.id);
}

/**
 * "Navbatga qo'yildi" xabari.
 *
 * Kanal tezligi chegarasidan oshganda post darhol chiqmaydi. Xodimga
 * qachon chiqishini aytamiz, aks holda u qayta-qayta e'lon qilishga
 * urinadi (va navbat yanada uzayadi).
 */
async function notifyQueued(productId: string): Promise<void> {
  try {
    const { channelQueueSummary } = await import("./channel-queue");
    const { pending, next } = await channelQueueSummary();
    const minutes = next ? Math.max(1, Math.round((next.dueAt - Date.now()) / 60_000)) : 1;
    await sendTopicMessage(
      "intake",
      `⏳ Kanal tezligi chegarasi: post <b>navbatga</b> qo'yildi.\n` +
        `Taxminan <b>${minutes} daqiqadan</b> keyin avtomatik chiqadi` +
        (pending > 1 ? ` (navbatda ${pending} ta).` : ".") +
        `\n\nTezlikni o'zgartirish: Sozlamalar → Bot sozlamalari → "Post tezligi".`
    ).catch(() => {});
  } catch (error) {
    console.error("Navbat xabarini yuborishda xato:", error);
  }
  void productId;
}

/** Kirim tarixiga yozuv (sayt: /admin/katalog/kirim/tarix). */
async function recordIntakeHistory(product: Product, userId: number, adminName: string): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection("stockIntakes").doc();
  const intake: StockIntake = {
    id: ref.id,
    adminUid: `tg:${userId}`,
    adminEmail: null,
    adminName: adminName || `Telegram #${userId}`,
    source: "telegram",
    kind: "new",
    items: [
      {
        productId: product.id,
        name: product.name,
        unit: product.unit,
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
  /** Xabardagi rasm (eng katta o'lcham) yoki video. */
  media?: IntakeMedia;
  mediaGroupId?: string;
}

/**
 * Kirim topic'iga tushgan xabarni qayta ishlaydi.
 * `true` - xabar shu oqimga tegishli edi (boshqa handler chaqirilmaydi).
 */
export async function handleIntakeMessage(params: IntakeMessageParams): Promise<boolean> {
  const { chatId, threadId, userId, caption, media, mediaGroupId } = params;

  // 1) Fayl umuman yo'q - eslatma.
  if (!media) {
    await sendChatMessage(
      chatId,
      [
        "🖼 Kirim uchun kamida <b>1 ta rasm</b> kerak (video ham qo'shsa bo'ladi).",
        "",
        "Rasm(lar)ni tashlab, izohiga quyidagicha yozing:",
        `<pre>${escapeHtml(INTAKE_TEMPLATE)}</pre>`,
        "Turlari (o'lcham/rang) bo'lsa:",
        `<pre>${escapeHtml(INTAKE_VARIANT_TEMPLATE)}</pre>`,
        "O'lcham + rang + qalinlik kabi bir nechta qator bo'lsa:",
        `<pre>${escapeHtml(INTAKE_MULTI_AXIS_TEMPLATE)}</pre>`,
      ].join("\n"),
      { threadId }
    );
    return true;
  }

  // 2) Izohsiz fayl - albom bo'lagi. Navbatga qo'yamiz va mahsulot
  //    tayyor bo'lsa (yoki bir ozdan keyin tayyor bo'lsa) biriktiramiz.
  if (!caption?.trim()) {
    if (!mediaGroupId) {
      await sendChatMessage(
        chatId,
        [
          "ℹ️ Fayl izohsiz kelgani uchun mahsulot yaratilmadi.",
          "",
          "Izohga quyidagilarni yozing:",
          `<pre>${escapeHtml(INTAKE_TEMPLATE)}</pre>`,
        ].join("\n"),
        { threadId }
      );
      return true;
    }

    const ref = albumRef(mediaGroupId);
    const album = (await ref.get()).data() as AlbumDoc | undefined;
    if (album?.rejected) return true;

    // Navbatga qo'shamiz (mahsulot hali yaratilmagan bo'lishi mumkin).
    await ref.set(
      {
        pendingMedia: FieldValue.arrayUnion(media),
        lastPhotoAt: Date.now(),
        createdAt: album?.createdAt ?? Date.now(),
      },
      { merge: true }
    );

    if (album?.productId) {
      await drainPendingMedia(mediaGroupId, album.productId);
      await announceWhenAlbumSettles(mediaGroupId, album.productId);
      return true;
    }

    // Mahsulot hali yaratilmagan - izohli xabar kelishini kutamiz.
    // Kutgandan keyin ham navbatni o'zimiz bo'shatib qo'yamiz, chunki
    // izohli xabar bizdan oldin ham, keyin ham kelishi mumkin.
    await new Promise((resolve) => setTimeout(resolve, ALBUM_SETTLE_MS));
    const later = (await ref.get()).data() as AlbumDoc | undefined;
    if (later?.productId) {
      await drainPendingMedia(mediaGroupId, later.productId);
      await announceWhenAlbumSettles(mediaGroupId, later.productId);
    }
    return true;
  }

  // 3) Izohli xabar - mahsulotni yaratamiz.
  //    Telegram javob kechiksa bir xil update'ni qayta yuborishi mumkin;
  //    albom uchun mahsulot allaqachon yaratilgan bo'lsa - ikkinchisini
  //    yaratmay, faylni o'shanga qo'shamiz.
  if (mediaGroupId) {
    const existing = (await albumRef(mediaGroupId).get()).data() as AlbumDoc | undefined;
    if (existing?.productId) {
      await albumRef(mediaGroupId).set(
        { pendingMedia: FieldValue.arrayUnion(media), lastPhotoAt: Date.now() },
        { merge: true }
      );
      await drainPendingMedia(mediaGroupId, existing.productId);
      await announceWhenAlbumSettles(mediaGroupId, existing.productId);
      return true;
    }
  }

  const taxonomy = await getTaxonomy();
  const parsed = parseIntakeCaption(caption, taxonomy);

  if (parsed.missing.length > 0) {
    if (mediaGroupId) {
      await albumRef(mediaGroupId).set({ rejected: true, createdAt: Date.now() }, { merge: true });
    }

    const guess = guessCategory(parsed.name);
    // Xodim yozgan kategoriyaga eng yaqin nomlar (xato yozilgan bo'lsa).
    const typedCategory = caption.match(/^\s*(?:kategoriya|turkum|bo['’]?lim|category|категория)\s*[:=]\s*(.+)$/im)?.[1] ?? "";
    const closeCategories = typedCategory ? suggestTaxonomy(taxonomy.categories, typedCategory, 5) : [];
    await sendChatMessage(
      chatId,
      [
        "⚠️ <b>Mahsulot qo'shilmadi.</b> Quyidagilar yetishmayapti:",
        ...parsed.missing.map((field) => `• ${INTAKE_FIELD_LABELS[field]}`),
        ...parsed.warnings.map((warning) => `⚠️ ${warning}`),
        "",
        // Kategoriya ro'yxati 40 tadan oshdi - hammasini yozib tashlash
        // yordam bermaydi. Avval YOZILGANIGA eng yaqin nomlar, keyin
        // nomdan taxmin, oxirida to'liq ro'yxat.
        parsed.missing.includes("category")
          ? [
              closeCategories.length > 0
                ? `🏷 Shulardan birimi? ${closeCategories.join(", ")}`
                : "",
              guess
                ? `(nomiga qaraganda "${labelOf(taxonomy.categories, guess)}" bo'lsa kerak)`
                : "",
              `Hammasi: ${taxonomy.categories.map((c) => c.label).join(", ")}`,
            ]
              .filter(Boolean)
              .join("\n")
          : "",
        parsed.missing.includes("unit")
          ? `📐 Sotish turlari: ${taxonomy.units.map((u) => u.label).join(", ")}`
          : "",
        parsed.missing.includes("material")
          ? `🧱 Materiallar: ${taxonomy.materials.map((m) => m.label).join(", ")}`
          : "",
        "",
        "Namuna:",
        `<pre>${escapeHtml(INTAKE_TEMPLATE)}</pre>`,
        "Turlari (o'lcham/rang) bo'lsa:",
        `<pre>${escapeHtml(INTAKE_VARIANT_TEMPLATE)}</pre>`,
        "O'lcham + rang + qalinlik kabi bir nechta qator bo'lsa:",
        `<pre>${escapeHtml(INTAKE_MULTI_AXIS_TEMPLATE)}</pre>`,
        "Rasmni izohi bilan qaytadan tashlang.",
      ]
        .filter(Boolean)
        .join("\n"),
      { threadId }
    );
    return true;
  }

  /**
   * TURLAR (izohda "Turlar:" bo'lsa). Har bir tur o'z narxi va zaxirasi
   * bilan saqlanadi; mahsulotning `price` i eng arzon turdan, `stock` i
   * esa turlar yig'indisidan olinadi (parser shuni qaytargan).
   */
  const axes: VariantAxis[] = parsed.variantAxisLabels.map((label) => ({
    key: axisKeyOf(label),
    label,
    values: [],
  }));
  const variants: ProductVariant[] = parsed.variants.map((item) => {
    const options: Record<string, string> = {};
    axes.forEach((axis, index) => {
      const value = item.values[index] ?? "";
      options[axis.key] = value;
      if (value && !axis.values.includes(value)) axis.values.push(value);
    });
    return {
      id: variantIdOf(axes, options),
      options,
      price: item.price,
      discountPrice: null,
      stock: item.stock,
      sku: item.sku,
    };
  });

  const db = getAdminDb();
  const now = Date.now();
  const ref = db.collection("products").doc();
  const product: Product = {
    id: ref.id,
    // Odamlar uchun qisqa tartib raqami (1, 2, 3...).
    code: await nextProductCode(),
    slug: `${parsed.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")}-${ref.id.slice(0, 6)}`,
    name: parsed.name,
    nameSearchIndex: parsed.name.toLowerCase(),
    nameTokens: buildNameTokens(parsed.name, parsed.brand, parsed.sku, parsed.keywords, [
      parsed.nameRu,
      parsed.nameEn,
    ]),
    description: parsed.description,
    // Ixtiyoriy maydonlar - faqat yozilgan bo'lsa hujjatga tushadi
    // (bo'sh satrlar bazani keraksiz to'ldirmasin).
    ...(parsed.keywords.length > 0 ? { keywords: parsed.keywords } : {}),
    ...(parsed.nameRu ? { nameRu: parsed.nameRu } : {}),
    ...(parsed.nameEn ? { nameEn: parsed.nameEn } : {}),
    ...(parsed.descriptionRu ? { descriptionRu: parsed.descriptionRu } : {}),
    ...(parsed.descriptionEn ? { descriptionEn: parsed.descriptionEn } : {}),
    ...(parsed.installService !== null ? { installService: parsed.installService } : {}),
    // TANNARX: mijozga hech qachon ko'rinmaydi (viewer.ts olib tashlaydi),
    // foyda hisoboti shunga tayanadi.
    costPrice: parsed.costPrice,
    sku: parsed.sku,
    category: parsed.category!,
    brand: parsed.brand,
    manufacturerCountry: parsed.manufacturerCountry,
    supplier: parsed.supplier,
    // Material MAJBURIY EMAS - bilinmasa bo'sh qoladi.
    material: parsed.material ?? "",
    unit: parsed.unit!,
    dimensions: {
      ...(parsed.diameterMm !== null ? { diameterMm: parsed.diameterMm } : {}),
      ...(parsed.lengthMm !== null ? { lengthMm: parsed.lengthMm } : {}),
      ...(parsed.weightKg !== null ? { weightKg: parsed.weightKg } : {}),
    },
    price: parsed.price!,
    ...(variants.length > 0 ? { variantAxes: axes, variants } : {}),
    discountPrice: parsed.discountPrice,
    discountUntil: parsed.discountUntil,
    currency: "UZS",
    stock: parsed.stock!,
    images: [],
    videos: [],
    thumbnailUrl: "",
    // CHERNOVIK: mahsulot "✅ Yetarli, tayyor" bosilgunicha katalogda ham,
    // kanalda ham ko'rinmaydi - avval qolgan ma'lumotlar to'ldiriladi.
    isActive: false,
    isDraft: true,
    salesCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(product);

  // Shu xabarning faylini ham navbatga qo'shib, hammasini birga
  // biriktiramiz (oldin kelgan fayllar navbatda turgan bo'lishi mumkin).
  if (mediaGroupId) {
    await albumRef(mediaGroupId).set(
      {
        productId: ref.id,
        pendingMedia: FieldValue.arrayUnion(media),
        lastPhotoAt: Date.now(),
        createdAt: Date.now(),
      },
      { merge: true }
    );
    await drainPendingMedia(mediaGroupId, ref.id);
  } else {
    await attachMedia(ref.id, media).catch((error) =>
      console.error("Kirim faylini yuklashda xato:", error)
    );
  }

  const unitLabel = labelOf(taxonomy.units, parsed.unit ?? undefined);

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
      `📥 Telegram kirim: №${product.code} — ${parsed.name}, ${parsed.stock} ${unitLabel}, ${formatSom(parsed.price!)} (${parsed.supplier})`
    ),
  ]);

  const fresh = await ref.get();
  const saved = { id: fresh.id, ...fresh.data() } as Product;

  const summary = [
    `📝 <b>Chernovik tayyor:</b> ${escapeHtml(saved.name)}`,
    `🆔 ID: <b>${saved.code ?? "-"}</b>`,
    saved.sku ? `#️⃣ Kodi: ${escapeHtml(saved.sku)}` : "",
    `🏷 ${labelOf(taxonomy.categories, saved.category)}` +
      (saved.material ? ` | 🧱 ${labelOf(taxonomy.materials, saved.material)}` : ""),
    variants.length > 0
      ? `💰 ${formatSom(saved.price)} dan / ${unitLabel} | 📦 jami ${saved.stock} ${unitLabel}`
      : `💰 ${formatSom(saved.price)} / ${unitLabel} | 📦 ${saved.stock} ${unitLabel}`,
    // Turlar ro'yxati - admin nima kirganini darhol ko'rib tursin.
    ...variants.map(
      (variant) =>
        `   • ${escapeHtml(axes.map((axis) => variant.options[axis.key]).filter(Boolean).join(" • "))}` +
        ` — ${formatSom(variant.price)} · ${variant.stock} ${unitLabel}` +
        (variant.sku ? ` · ${escapeHtml(variant.sku)}` : "")
    ),
    `🚚 Kimdan: ${escapeHtml(saved.supplier ?? "")}`,
    mediaGroupId ? "🖼 Fayllar yuklanmoqda..." : `🖼 ${media.kind === "video" ? "Video" : "Rasm"} qo'shildi.`,
    ...parsed.warnings.map((warning) => `⚠️ ${warning}`),
    "",
    "⏳ Mahsulot hali <b>katalogga chiqmadi</b>. \"✅ Yetarli, tayyor\" bosilganda katalogga qo'shiladi va kanalga e'lon qilinadi.",
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

  // Kanalga e'lon: albom bo'lsa qolgan fayllar kelishini kutamiz,
  // yolg'iz fayl bo'lsa - darhol.
  if (mediaGroupId) {
    await announceWhenAlbumSettles(mediaGroupId, saved.id);
  } else {
    const withMedia = await ref.get();
    const result = await announceProduct(
      { id: withMedia.id, ...withMedia.data() } as Product,
      "new"
    ).catch((error) => {
      console.error("Kanalga e'lon (kirim) xatosi:", error);
      return "skipped" as const;
    });
    if (result === "queued") await notifyQueued(withMedia.id);
  }

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
