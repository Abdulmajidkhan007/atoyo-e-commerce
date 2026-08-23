import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendChatMessage, answerCallbackQuery, downloadTelegramFile } from "./bot";
import { uploadImageAdmin, uploadVideoAdmin } from "@/lib/firebase/admin-storage";
import { buildNameTokens } from "@/lib/search/tokens";
import { announceProduct, announceModeFor, type AnnounceResult } from "./channel";
import { nextProductCode, findProductIdByCode } from "@/lib/products/product-code";
import { registerFacets } from "@/lib/products/facets";
import { logAction } from "./action-log";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { DEFAULT_UNIT, labelOf, type TaxonomyItem } from "@/lib/products/taxonomy";
import { parseDate, parseVariantLine } from "./intake-parser";
import {
  axisKeyOf,
  minVariantPrice,
  normalizeVariants,
  totalVariantStock,
  variantIdOf,
  variantLabel,
} from "@/lib/products/variants";
import type {
  Product,
  ProductCategory,
  ProductMaterial,
  ProductVariant,
  VariantAxis,
} from "@/types/product";
import { formatSom } from "@/lib/format";
import { escapeHtml } from "./html";

/**
 * INTERAKTIV ADMIN OQIMI (BotFather uslubidagi tugmali menyu).
 *
 * Admin guruhida <code>/yangi</code> yoki <code>/tahrir ID</code> yuborilganda
 * bir qatorli "pipe" format o'rniga bosqichma-bosqich (nom → tugmalar orqali
 * detallar) so'rov boshlanadi. Holat Firestore <code>adminSessions/{userId}</code>
 * hujjatida saqlanadi, shuning uchun har bir admin uchun alohida bo'ladi.
 *
 * Callback data prefiksi: <code>ap|</code> (admin-product). Webhook admin
 * guruhdagi barcha <code>ap|</code> tugmalarini shu modulga yo'naltiradi.
 */

/** Emoji bilan chiroyli ko'rinsin - standart kategoriyalar uchun. */
const CATEGORY_ICONS: Record<string, string> = {
  pipes: "🔧",
  fittings: "🔩",
  faucets: "🚰",
  "shower-systems": "🚿",
  boilers: "🔥",
  radiators: "🌡",
  pumps: "⚙️",
  "sanitary-ware": "🚽",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.web.app";

// Yangi mahsulot oqimi bosqichlari tartibi.
// Kategoriya, material va sotish turi - majburiy bosqichlar (tugmalar
// bilan tanlanadi), qolganlarini o'tkazib yuborsa ham bo'ladi.
const NEW_STEPS = [
  "name",
  "category",
  "price",
  "unit",
  "stock",
  "material",
  "brand",
  "country",
  "description",
  "photo",
] as const;
type NewStep = (typeof NEW_STEPS)[number];

/** Telegram'dan kelgan rasmni Storage'ga o'tkazib, mahsulotga bog'laydi. */
async function attachTelegramPhoto(productId: string, photoFileId: string): Promise<string> {
  const file = await downloadTelegramFile(photoFileId);
  const url = await uploadImageAdmin(`products/${productId}`, {
    buffer: file.buffer,
    contentType: file.contentType,
    originalName: file.fileName,
  });
  const ref = getAdminDb().collection("products").doc(productId);
  const snap = await ref.get();
  const existing = (snap.data() as Product | undefined)?.images ?? [];
  await ref.update({
    thumbnailUrl: url,
    images: [url, ...existing.filter((i) => i !== url)].slice(0, 10),
    updatedAt: Date.now(),
  });
  return url;
}

/**
 * RASMNI MAHSULOTDAN OLIB TASHLASH.
 *
 * Fayl Storage'da QOLADI - u boshqa joyda ishlatilayotgan bo'lishi
 * mumkin va o'chirilgan mahsulot savatdan tiklanganda rasmlari
 * joyida turishi kerak (`lib/products/trash.ts` bilan bir xil
 * mantiq). Bu yerda faqat bog'lanish uziladi.
 *
 * Birinchi rasm o'chirilsa muqova (`thumbnailUrl`) keyingisiga
 * o'tadi; rasm qolmasa bo'sh bo'ladi.
 */
async function detachProductPhoto(productId: string, index: number): Promise<Product | null> {
  const ref = getAdminDb().collection("products").doc(productId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const product = { id: snap.id, ...snap.data() } as Product;
  const images = [...(product.images ?? [])];
  if (index < 0 || index >= images.length) return product;

  images.splice(index, 1);
  const updates = {
    images,
    thumbnailUrl: images[0] ?? "",
    updatedAt: Date.now(),
  };
  await ref.update(updates);
  return { ...product, ...updates };
}

/** Mahsulotda ko'pi bilan shuncha video (kirim oqimi bilan bir xil). */
const MAX_VIDEOS = 3;

/**
 * Telegram'dan kelgan VIDEONI Storage'ga o'tkazib, mahsulotga bog'laydi.
 *
 * Bot API'da `getFile` 20 MB gacha fayl beradi - kattasi uchun
 * Telegram havola bermaydi, shuning uchun xodimga qisqa video
 * yuborish kerakligi aytiladi (`uploadVideoAdmin` ham 20 MB bilan
 * cheklaydi).
 */
async function attachTelegramVideo(productId: string, videoFileId: string): Promise<void> {
  const file = await downloadTelegramFile(videoFileId);
  const url = await uploadVideoAdmin(`products/${productId}`, {
    buffer: file.buffer,
    // Telegram video fayli .mp4 bo'ladi; getFile turini bermaydi.
    contentType: "video/mp4",
    originalName: file.fileName,
  });

  const ref = getAdminDb().collection("products").doc(productId);
  const snap = await ref.get();
  const existing = (snap.data() as Product | undefined)?.videos ?? [];
  if (existing.includes(url)) return;
  if (existing.length >= MAX_VIDEOS) {
    throw new Error(`Mahsulotda ${MAX_VIDEOS} tadan ko'p video bo'lmaydi.`);
  }
  await ref.update({ videos: [...existing, url], updatedAt: Date.now() });
}

/**
 * VIDEONI MAHSULOTDAN OLIB TASHLASH. Rasmdagi kabi fayl Storage'da
 * QOLADI - faqat bog'lanish uziladi.
 */
async function detachProductVideo(productId: string, index: number): Promise<Product | null> {
  const ref = getAdminDb().collection("products").doc(productId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const product = { id: snap.id, ...snap.data() } as Product;
  const videos = [...(product.videos ?? [])];
  if (index < 0 || index >= videos.length) return product;

  videos.splice(index, 1);
  await ref.update({ videos, updatedAt: Date.now() });
  return { ...product, videos };
}

interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

interface AdminSession {
  flow: "new_product" | "edit_product";
  step: string;
  /**
   * Tahrir paytida mahsulot o'zgargan, lekin kanalga hali e'lon
   * qilinmagan. "✅ Tugatish" bosilganda bir marta yuboriladi.
   */
  pendingAnnounce?: boolean;
  /**
   * Kutayotgan e'lonning sarlavhasi: narx/chegirma o'zgarsa
   * "♻️ Mahsulot yangilandi", qolgan hollarda post jimgina
   * yangilanadi (`refresh`).
   */
  pendingAnnounceMode?: "refresh" | "updated";
  chatId: number;
  threadId?: number;
  draft: Partial<Product>;
  productId?: string;
  editField?: string;
  /** "Turlar" oynasida tanlangan tur (ro'yxatdagi tartib raqami). */
  variantIndex?: number;
  updatedAt: number;
}

function sessionRef(userId: number) {
  return getAdminDb().collection("adminSessions").doc(String(userId));
}

async function getSession(userId: number): Promise<AdminSession | null> {
  const snap = await sessionRef(userId).get();
  return snap.exists ? (snap.data() as AdminSession) : null;
}

async function saveSession(userId: number, session: AdminSession): Promise<void> {
  await sessionRef(userId).set({ ...session, updatedAt: Date.now() });
}

async function clearSession(userId: number): Promise<void> {
  await sessionRef(userId).delete().catch(() => {});
}

function parseNumber(text: string): number {
  return Number(text.replace(/[\s,]/g, ""));
}

const cancelButton: InlineButton = { text: "✖️ Bekor qilish", callback_data: "ap|cancel" };
const skipButton: InlineButton = { text: "⏭ O'tkazish", callback_data: "ap|skip" };

/** Ro'yxatdan ikki ustunli tugmalar yasaydi. */
function itemsKeyboard(items: TaxonomyItem[], prefix: string, icons = false): InlineButton[][] {
  const rows: InlineButton[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(
      items.slice(i, i + 2).map((item) => ({
        text: icons ? `${CATEGORY_ICONS[item.slug] ?? "🏷"} ${item.label}` : item.label,
        callback_data: `${prefix}${item.slug}`,
      }))
    );
  }
  return rows;
}

async function categoryKeyboard(prefix: string): Promise<InlineButton[][]> {
  const { categories } = await getTaxonomy();
  return itemsKeyboard(categories, prefix, true);
}

async function materialKeyboard(prefix: string): Promise<InlineButton[][]> {
  const { materials } = await getTaxonomy();
  return itemsKeyboard(materials, prefix);
}

async function unitKeyboard(prefix: string): Promise<InlineButton[][]> {
  const { units } = await getTaxonomy();
  return itemsKeyboard(units, prefix);
}

// ---------------------------------------------------------------------------
// YANGI MAHSULOT: bosqich promptlari
// ---------------------------------------------------------------------------

async function sendNewStepPrompt(session: AdminSession): Promise<void> {
  const stepNo = NEW_STEPS.indexOf(session.step as NewStep) + 1;
  const total = NEW_STEPS.length;
  const head = `🆕 <b>Yangi mahsulot</b> — ${stepNo}/${total}`;
  const opts = { threadId: session.threadId };

  switch (session.step as NewStep) {
    case "name":
      await sendChatMessage(session.chatId, `${head}\n\nMahsulot <b>nomini</b> yuboring:`, {
        replyMarkup: { inline_keyboard: [[cancelButton]] },
        ...opts,
      });
      return;
    case "category":
      await sendChatMessage(session.chatId, `${head}\n\n<b>Kategoriya</b>ni tanlang:`, {
        replyMarkup: { inline_keyboard: [...(await categoryKeyboard("ap|cat|")), [cancelButton]] },
        ...opts,
      });
      return;
    case "price":
      await sendChatMessage(session.chatId, `${head}\n\n<b>Narx</b>ini yuboring (so'mda, masalan 45000):`, {
        replyMarkup: { inline_keyboard: [[cancelButton]] },
        ...opts,
      });
      return;
    case "unit":
      await sendChatMessage(session.chatId, `${head}\n\n<b>Sotish turi</b>ni tanlang (dona/metr/kg...):`, {
        replyMarkup: { inline_keyboard: [...(await unitKeyboard("ap|unt|")), [cancelButton]] },
        ...opts,
      });
      return;
    case "stock":
      await sendChatMessage(
        session.chatId,
        `${head}\n\n<b>Zaxira</b> miqdorini yuboring (${labelOf(
          (await getTaxonomy()).units,
          session.draft.unit ?? DEFAULT_UNIT
        )} hisobida, masalan 30):`,
        { replyMarkup: { inline_keyboard: [[cancelButton]] }, ...opts }
      );
      return;
    case "brand":
      await sendChatMessage(session.chatId, `${head}\n\n<b>Brend</b>ni yuboring (yoki o'tkazing):`, {
        replyMarkup: { inline_keyboard: [[skipButton], [cancelButton]] },
        ...opts,
      });
      return;
    case "country":
      await sendChatMessage(session.chatId, `${head}\n\n<b>Ishlab chiqargan davlat</b>ni yuboring (yoki o'tkazing):`, {
        replyMarkup: { inline_keyboard: [[skipButton], [cancelButton]] },
        ...opts,
      });
      return;
    case "material":
      await sendChatMessage(session.chatId, `${head}\n\n<b>Material</b>ni tanlang (yoki o'tkazing):`, {
        replyMarkup: { inline_keyboard: [...(await materialKeyboard("ap|mat|")), [cancelButton]] },
        ...opts,
      });
      return;
    case "description":
      await sendChatMessage(session.chatId, `${head}\n\n<b>Tavsif</b>ni yuboring (yoki o'tkazing):`, {
        replyMarkup: { inline_keyboard: [[skipButton], [cancelButton]] },
        ...opts,
      });
      return;
    case "photo":
      await sendChatMessage(session.chatId, `${head}\n\n🖼 Mahsulot <b>rasmini</b> yuboring (yoki o'tkazing):`, {
        replyMarkup: { inline_keyboard: [[skipButton], [cancelButton]] },
        ...opts,
      });
      return;
  }
}

async function finalizeNewProduct(userId: number, session: AdminSession, photoFileId?: string): Promise<void> {
  const d = session.draft;
  const now = Date.now();
  const ref = getAdminDb().collection("products").doc();
  const name = d.name ?? "Nomsiz mahsulot";
  const product: Product = {
    id: ref.id,
    slug: `${name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")}-${ref.id.slice(0, 6)}`,
    name,
    nameSearchIndex: name.toLowerCase(),
    nameTokens: buildNameTokens(name, d.brand),
    description: d.description ?? "",
    category: (d.category as ProductCategory) ?? "sanitary-ware",
    brand: d.brand ?? "",
    manufacturerCountry: d.manufacturerCountry ?? "",
    material: (d.material as ProductMaterial) ?? "brass",
    unit: d.unit ?? DEFAULT_UNIT,
    // Odamlar uchun qisqa tartib raqami (1, 2, 3...).
    code: await nextProductCode(),
    dimensions: {},
    price: d.price ?? 0,
    discountPrice: null,
    currency: "UZS",
    stock: d.stock ?? 0,
    images: [],
    thumbnailUrl: "",
    isActive: true,
    salesCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(product);
  await clearSession(userId);

  // Telegram'dan rasm yuborilgan bo'lsa - Storage'ga o'tkazib bog'laymiz.
  let photoNote = `🖼 Rasm yuklash: ${SITE_URL}/admin/katalog yoki /tahrir ${ref.id}`;
  if (photoFileId) {
    try {
      await attachTelegramPhoto(ref.id, photoFileId);
      photoNote = "🖼 Rasm qo'shildi ✅";
    } catch (error) {
      console.error("Telegram rasmni yuklashda xato:", error);
      photoNote = `⚠️ Rasm yuklanmadi. Keyinroq: /tahrir ${ref.id}`;
    }
  }

  // Rasm biriktirilgandan keyin - kanalga e'lon (eng yangi holat bilan).
  try {
    const fresh = await getAdminDb().collection("products").doc(ref.id).get();
    if (fresh.exists) await announceProduct({ id: fresh.id, ...fresh.data() } as Product, "new");
  } catch (error) {
    console.error("Kanalga e'lon (yangi mahsulot) xatosi:", error);
  }

  await sendChatMessage(
    session.chatId,
    [
      `✅ <b>Qo'shildi:</b> ${escapeHtml(product.name)}`,
      `🆔 ID: <b>${product.code}</b>`,
      `Kategoriya: ${labelOf((await getTaxonomy()).categories, product.category)}`,
      `Narx: ${formatSom(product.price)} | Zaxira: ${product.stock} dona`,
      product.brand ? `Brend: ${escapeHtml(product.brand)}` : "",
      "",
      photoNote,
    ]
      .filter(Boolean)
      .join("\n"),
    { threadId: session.threadId }
  );
}

// ---------------------------------------------------------------------------
// TAHRIRLASH: maydon menyusi
// ---------------------------------------------------------------------------

const EDIT_FIELDS: { field: string; label: string }[] = [
  { field: "name", label: "✏️ Nom" },
  { field: "price", label: "💰 Narx" },
  { field: "stock", label: "📦 Zaxira" },
  { field: "category", label: "🏷 Kategoriya" },
  { field: "material", label: "🧱 Material" },
  { field: "brand", label: "™️ Brend" },
  { field: "country", label: "🌍 Davlat" },
  { field: "discount", label: "🔻 Chegirma" },
  { field: "discountUntil", label: "⏳ Chegirma muddati" },
  { field: "unit", label: "📐 Sotish turi" },
  { field: "supplier", label: "🚚 Kimdan kelgan" },
  { field: "description", label: "📝 Tavsif" },
  { field: "photo", label: "🖼 Rasm" },
  { field: "video", label: "🎬 Video" },
];

/**
 * Kirim topic'idan yaratilgan mahsulot uchun "qolgan ma'lumotlarni
 * to'ldirasizmi?" savoli. Majburiy maydonlar allaqachon to'lgan -
 * bu yerdagilarning hammasi ixtiyoriy, shuning uchun "keyinroq"
 * tugmasi ham bor. Tugmalar mavjud tahrir oqimini (ap|ef|...) ishlatadi.
 */
const OPTIONAL_FIELDS: { field: string; label: string }[] = [
  { field: "category", label: "🏷 Kategoriya" },
  { field: "brand", label: "™️ Brend" },
  { field: "country", label: "🌍 Davlat" },
  { field: "unit", label: "📐 Sotish turi" },
  { field: "description", label: "📝 Tavsif" },
  { field: "discount", label: "🔻 Chegirma" },
  { field: "discountUntil", label: "⏳ Chegirma muddati" },
  { field: "photo", label: "🖼 Yana rasm" },
  { field: "video", label: "🎬 Video" },
  { field: "name", label: "✏️ Nomni tuzatish" },
];

export async function startOptionalFieldsFlow(params: {
  chatId: number;
  threadId?: number;
  userId: number;
  product: Product;
  /** Tugmalar ustida chiqadigan xabar (kirim xulosasi). */
  header: string;
}): Promise<void> {
  const { chatId, threadId, userId, product, header } = params;

  const session: AdminSession = {
    flow: "edit_product",
    step: "menu",
    chatId,
    threadId,
    draft: {},
    productId: product.id,
    updatedAt: Date.now(),
  };
  await saveSession(userId, session);

  const rows: InlineButton[][] = [];
  for (let i = 0; i < OPTIONAL_FIELDS.length; i += 2) {
    rows.push(
      OPTIONAL_FIELDS.slice(i, i + 2).map((f) => ({ text: f.label, callback_data: `ap|ef|${f.field}` }))
    );
  }
  rows.push([{ text: "✅ Yetarli, tayyor", callback_data: "ap|done" }]);

  await sendChatMessage(
    chatId,
    [header, "", "Qolgan ma'lumotlarni ham to'ldirasizmi? (ixtiyoriy)"].join("\n"),
    { replyMarkup: { inline_keyboard: rows }, threadId }
  );
}

/**
 * RASMLAR MENYUSI: qo'shish va O'CHIRISH.
 *
 * Ilgari "🖼 Rasm" tugmasi to'g'ridan-to'g'ri "rasm yuboring" deb
 * so'rardi - ya'ni rasm faqat QO'SHILARDI. Xunuk yoki noto'g'ri
 * rasmni olib tashlashning yo'li yo'q edi (faqat saytdan).
 */
async function sendPhotoMenu(session: AdminSession, product: Product): Promise<void> {
  const images = product.images ?? [];
  const rows: InlineButton[][] = [[{ text: "➕ Rasm qo'shish", callback_data: "ap|ph|add" }]];

  // Har rasm uchun alohida tugma: "🗑 1-rasm", "🗑 2-rasm" ...
  // Birinchisi muqova ekani ochiq yoziladi.
  for (let i = 0; i < images.length; i += 2) {
    rows.push(
      images.slice(i, i + 2).map((_, j) => ({
        text: i + j === 0 ? "🗑 1-rasm (muqova)" : `🗑 ${i + j + 1}-rasm`,
        callback_data: `ap|ph|del:${i + j}`,
      }))
    );
  }

  rows.push([{ text: "⬅️ Orqaga", callback_data: "ap|ef|back" }]);

  const text =
    images.length > 0
      ? `🖼 <b>Rasmlar:</b> ${images.length} ta.\n\nO'chirish uchun raqamini bosing (birinchisi — muqova, kartochkada shu ko'rinadi).`
      : "🖼 Mahsulotda hali rasm yo'q.";

  await sendChatMessage(session.chatId, text, {
    replyMarkup: { inline_keyboard: rows },
    threadId: session.threadId,
  });
}

/**
 * VIDEOLAR MENYUSI: qo'shish va o'chirish (rasmlar menyusi bilan
 * bir xil naqsh). Video mahsulot sahifasida galereyaning oxirgi
 * slaydi bo'lib chiqadi.
 */
async function sendVideoMenu(session: AdminSession, product: Product): Promise<void> {
  const videos = product.videos ?? [];
  const rows: InlineButton[][] = [];
  if (videos.length < MAX_VIDEOS) {
    rows.push([{ text: "➕ Video qo'shish", callback_data: "ap|vd|add" }]);
  }
  for (let i = 0; i < videos.length; i += 1) {
    rows.push([{ text: `🗑 ${i + 1}-video`, callback_data: `ap|vd|del:${i}` }]);
  }
  rows.push([{ text: "⬅️ Orqaga", callback_data: "ap|ef|back" }]);

  const text =
    videos.length > 0
      ? `🎬 <b>Videolar:</b> ${videos.length} ta (ko'pi bilan ${MAX_VIDEOS} ta).\n\nVideo saytdagi galereyada rasmlardan keyin ko'rinadi.`
      : `🎬 Mahsulotda hali video yo'q.\n\nVideo yuborsangiz u saytdagi galereyaga tushadi (20 MB gacha).`;

  await sendChatMessage(session.chatId, text, {
    replyMarkup: { inline_keyboard: rows },
    threadId: session.threadId,
  });
}

async function sendEditMenu(session: AdminSession, product: Product): Promise<void> {
  const rows: InlineButton[][] = [];
  for (let i = 0; i < EDIT_FIELDS.length; i += 2) {
    rows.push(EDIT_FIELDS.slice(i, i + 2).map((f) => ({ text: f.label, callback_data: `ap|ef|${f.field}` })));
  }
  // TURLARI (o'lcham/rang/qalinlik) - alohida oyna: ro'yxat va
  // "yangi tur qo'shish". Turlari yo'q mahsulotda ham ko'rinadi -
  // birinchi turni shu yerdan boshlash mumkin.
  const variantCount = product.variants?.length ?? 0;
  rows.push([
    {
      text: variantCount > 0 ? `🔀 Turlar (${variantCount} ta)` : "🔀 Turlar qo'shish",
      callback_data: "ap|vr|list",
    },
  ]);
  rows.push([{ text: "✅ Tugatish", callback_data: "ap|done" }]);

  await sendChatMessage(
    session.chatId,
    [
      `✏️ <b>Tahrirlash:</b> ${escapeHtml(product.name)}`,
      `🆔 ID: <b>${product.code ?? "-"}</b>`,
      variantCount > 0
        ? `Narx: ${formatSom(product.price)} dan | Jami zaxira: ${product.stock} | Turlari: ${variantCount} ta`
        : `Narx: ${formatSom(product.price)} | Zaxira: ${product.stock} dona`,
      product.isActive ? "" : "🚫 Yashirin",
      "",
      "O'zgartirmoqchi bo'lgan maydonni tanlang:",
    ]
      .filter(Boolean)
      .join("\n"),
    { replyMarkup: { inline_keyboard: rows }, threadId: session.threadId }
  );
}

const EDIT_VALUE_PROMPTS: Record<string, string> = {
  name: "Yangi <b>nom</b>ni yuboring:",
  price: "Yangi <b>narx</b>ni yuboring (so'mda):",
  stock: "Yangi <b>zaxira</b> sonini yuboring:",
  brand: "Yangi <b>brend</b>ni yuboring:",
  country: "Yangi <b>davlat</b>ni yuboring:",
  discount: "Yangi <b>chegirma narx</b>ini yuboring (o'chirish uchun 0):",
  discountUntil:
    "Chegirma <b>qaysi kungacha</b> amal qiladi? Sanani <code>31.12.2026</code> ko'rinishida yuboring (muddatsiz uchun 0):",
  supplier: "Mahsulot <b>kimdan kelgan</b>ini yuboring:",
  description: "Yangi <b>tavsif</b>ni yuboring:",
  photo: "🖼 Yangi <b>rasm</b>ni yuboring (oddiy rasm sifatida):",
};

// ---------------------------------------------------------------------------
// KIRISH NUQTALARI (admin-commands.ts chaqiradi)
// ---------------------------------------------------------------------------

export async function startNewProductFlow(chatId: number, threadId: number | undefined, userId: number): Promise<void> {
  const session: AdminSession = {
    flow: "new_product",
    step: "name",
    chatId,
    threadId,
    draft: {},
    updatedAt: Date.now(),
  };
  await saveSession(userId, session);
  await sendNewStepPrompt(session);
}

export async function startEditProductFlow(
  chatId: number,
  threadId: number | undefined,
  userId: number,
  productIdOrCode: string
): Promise<boolean> {
  // Adminlar odatda qisqa raqam yozadi (`/tahrir 12`), lekin uzun hujjat
  // ID si ham qabul qilinadi.
  const trimmed = productIdOrCode.trim().replace(/^#|^№/, "");
  const productId = /^\d+$/.test(trimmed) ? (await findProductIdByCode(Number(trimmed))) ?? trimmed : trimmed;
  const snap = await getAdminDb().collection("products").doc(productId).get();
  if (!snap.exists) return false;
  const product = { id: snap.id, ...snap.data() } as Product;
  const session: AdminSession = {
    flow: "edit_product",
    step: "menu",
    chatId,
    threadId,
    draft: {},
    productId,
    updatedAt: Date.now(),
  };
  await saveSession(userId, session);
  await sendEditMenu(session, product);
  return true;
}

export async function cancelAdminSession(chatId: number, threadId: number | undefined, userId: number): Promise<void> {
  await clearSession(userId);
  await sendChatMessage(chatId, "❌ Bekor qilindi.", { threadId });
}

// ---------------------------------------------------------------------------
// MATNLI JAVOBLAR (bosqichdagi qiymatlar)
// ---------------------------------------------------------------------------

/** Admin guruhda "/" bilan boshlanmagan matn kelganda chaqiriladi. Sessiya
 *  bo'lsa true qaytaradi (ishlov berildi), bo'lmasa false. */
export async function handleAdminSessionMessage(params: {
  chatId: number;
  userId: number;
  threadId?: number;
  text: string;
  /** Admin rasm yuborgan bo'lsa - eng katta o'lchamdagi file_id. */
  photoFileId?: string;
  /** Admin video yuborgan bo'lsa - uning file_id si. */
  videoFileId?: string;
}): Promise<boolean> {
  const { chatId, userId, text, photoFileId, videoFileId } = params;
  const session = await getSession(userId);
  if (!session) return false;
  session.threadId = session.threadId ?? params.threadId;
  const value = text.trim();

  if (session.flow === "new_product") {
    await handleNewProductText(userId, session, value, photoFileId);
    return true;
  }

  if (session.flow === "edit_product" && session.step === "edit_value" && session.editField === "photo") {
    if (!photoFileId) {
      await sendChatMessage(chatId, "Iltimos, rasmni oddiy rasm (photo) sifatida yuboring.", {
        threadId: session.threadId,
      });
      return true;
    }
    let photoAdded = false;
    if (session.productId) {
      try {
        await attachTelegramPhoto(session.productId, photoFileId);
        photoAdded = true;
        await sendChatMessage(chatId, "🖼 Rasm qo'shildi ✅", { threadId: session.threadId });
      } catch (error) {
        console.error("Rasm yangilashda xato:", error);
        await sendChatMessage(chatId, "⚠️ Rasm yuklanmadi. Qayta urinib ko'ring.", { threadId: session.threadId });
      }
    }
    await reloadEditMenu(userId, session, photoAdded);
    return true;
  }

  if (session.flow === "edit_product" && session.step === "edit_value" && session.editField === "video") {
    if (!videoFileId) {
      await sendChatMessage(
        chatId,
        "Iltimos, videoni <b>video</b> sifatida yuboring (fayl/hujjat emas).",
        { threadId: session.threadId }
      );
      return true;
    }
    let videoAdded = false;
    if (session.productId) {
      try {
        await attachTelegramVideo(session.productId, videoFileId);
        videoAdded = true;
        await sendChatMessage(chatId, "🎬 Video qo'shildi ✅ Saytdagi galereyada ko'rinadi.", {
          threadId: session.threadId,
        });
      } catch (error) {
        console.error("Video yuklashda xato:", error);
        // Sabab aniq aytiladi: hajm chegarasi eng ko'p uchraydigan holat.
        const reason = error instanceof Error ? error.message : "Noma'lum xato";
        await sendChatMessage(
          chatId,
          `⚠️ Video yuklanmadi: ${reason}\n\nTelegram bot 20 MB gacha faylni oladi — qisqaroq video yuboring.`,
          { threadId: session.threadId }
        );
      }
    }
    await reloadEditMenu(userId, session, videoAdded);
    return true;
  }

  if (session.flow === "edit_product" && session.step === "edit_value" && session.editField) {
    await applyEditValue(userId, session, session.editField, value);
    return true;
  }

  // Tahrir menyusida matn kutilmaydi - tugmani bosishni eslatamiz.
  if (session.flow === "edit_product") {
    await sendChatMessage(chatId, "Iltimos, quyidagi tugmalardan birini tanlang yoki ✅ Tugatish.", {
      threadId: session.threadId,
    });
    return true;
  }
  return false;
}

async function handleNewProductText(
  userId: number,
  session: AdminSession,
  value: string,
  photoFileId?: string
): Promise<void> {
  const step = session.step as NewStep;

  // Rasm bosqichi: photo kutiladi (yoki ⏭ O'tkazish tugmasi).
  if (step === "photo") {
    if (photoFileId) {
      await finalizeNewProduct(userId, session, photoFileId);
    } else {
      await sendChatMessage(session.chatId, "Iltimos, rasmni oddiy rasm (photo) sifatida yuboring yoki ⏭ O'tkazish tugmasini bosing.", {
        threadId: session.threadId,
      });
    }
    return;
  }

  if (step === "category" || step === "material" || step === "unit") {
    // Bu bosqichlarda tugma tanlanishi kerak.
    await sendChatMessage(session.chatId, "Iltimos, yuqoridagi tugmalardan birini tanlang.", {
      threadId: session.threadId,
    });
    return;
  }

  if (step === "name") {
    if (!value) {
      await sendChatMessage(session.chatId, "Nom bo'sh bo'lmasligi kerak. Qaytadan yuboring:", { threadId: session.threadId });
      return;
    }
    session.draft.name = value;
  } else if (step === "price" || step === "stock") {
    const n = parseNumber(value);
    if (Number.isNaN(n) || n < 0) {
      await sendChatMessage(session.chatId, "Faqat musbat son yuboring (masalan 45000):", { threadId: session.threadId });
      return;
    }
    if (step === "price") session.draft.price = n;
    else session.draft.stock = n;
  } else if (step === "brand") {
    session.draft.brand = value;
  } else if (step === "country") {
    session.draft.manufacturerCountry = value;
  } else if (step === "description") {
    session.draft.description = value;
  }

  await advanceNewProduct(userId, session);
}

async function advanceNewProduct(userId: number, session: AdminSession): Promise<void> {
  const idx = NEW_STEPS.indexOf(session.step as NewStep);
  const next = NEW_STEPS[idx + 1];
  if (!next) {
    await finalizeNewProduct(userId, session);
    return;
  }
  session.step = next;
  await saveSession(userId, session);
  await sendNewStepPrompt(session);
}

async function applyEditValue(userId: number, session: AdminSession, field: string, value: string): Promise<void> {
  // Turlar (o'lcham/rang) alohida oqim: qator nomi, yangi tur qatori
  // va mavjud turning narx/zaxira/kodi.
  if (field === "variant_axis" || field === "variant_add" || field.startsWith("v:")) {
    await applyVariantValue(userId, session, field, value);
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (field === "name") {
    if (!value) {
      await sendChatMessage(session.chatId, "Nom bo'sh bo'lmasligi kerak. Qaytadan yuboring:", { threadId: session.threadId });
      return;
    }
    updates.name = value;
    updates.nameSearchIndex = value.toLowerCase();
    updates.nameTokens = buildNameTokens(value);
  } else if (field === "price" || field === "stock" || field === "discount") {
    const n = parseNumber(value);
    if (Number.isNaN(n) || n < 0) {
      await sendChatMessage(session.chatId, "Faqat musbat son yuboring:", { threadId: session.threadId });
      return;
    }
    if (field === "price") updates.price = n;
    else if (field === "stock") updates.stock = n;
    else updates.discountPrice = n > 0 ? n : null;
  } else if (field === "discountUntil") {
    // "0" - muddatni olib tashlash; aks holda kun.oy.yil kutiladi.
    if (value.trim() === "0") {
      updates.discountUntil = null;
    } else {
      const until = parseDate(value);
      if (until === null) {
        await sendChatMessage(
          session.chatId,
          "Sanani <code>31.12.2026</code> ko'rinishida yuboring (muddatsiz uchun 0):",
          { threadId: session.threadId }
        );
        return;
      }
      updates.discountUntil = until;
    }
  } else if (field === "brand") {
    updates.brand = value;
    void registerFacets({ brand: value });
  } else if (field === "country") {
    updates.manufacturerCountry = value;
    void registerFacets({ country: value });
  } else if (field === "supplier") {
    updates.supplier = value;
    void registerFacets({ supplier: value });
  } else if (field === "description") {
    updates.description = value;
  }

  if (!session.productId) return;
  const ref = getAdminDb().collection("products").doc(session.productId);
  // Kanalda "yangilandi" deyish uchun avvalgi holat kerak (narx/chegirma
  // o'zgardimi, tugagan mahsulot qayta keldimi).
  const before = (await ref.get()).data() as Product | undefined;
  await ref.update(updates);
  // Menyuga qaytamiz.
  session.step = "menu";
  session.editField = undefined;
  await saveSession(userId, session);
  const snap = await ref.get();
  await sendChatMessage(session.chatId, "✅ Yangilandi.", { threadId: session.threadId });
  if (snap.exists) {
    const product = { id: snap.id, ...snap.data() } as Product;
    /**
     * KANALGA HOZIR TEGILMAYDI - "✅ Tugatish" bosilganda bir marta.
     * Lekin SARLAVHA hozir hal qilinadi: narx/chegirma o'zgargan
     * bo'lsa post "♻️ Mahsulot yangilandi" bo'lib chiqishi kerak,
     * aks holda jimgina yangilanadi.
     */
    const mode = before ? announceModeFor(before, product) : "refresh";
    session.pendingAnnounce = true;
    if (mode === "updated") session.pendingAnnounceMode = "updated";
    await saveSession(userId, session);
    await sendEditMenu(session, product);
  }
}

// ---------------------------------------------------------------------------
// TURLAR (o'lcham / rang / qalinlik) - botdan boshqarish
// ---------------------------------------------------------------------------

/** Bir oynada ko'rsatiladigan turlar soni (tugmalar juda ko'payib ketmasin). */
const MAX_VARIANT_BUTTONS = 12;

/** Turlar ro'yxati: har birining nomi, narxi, kodi va zaxirasi. */
async function sendVariantMenu(session: AdminSession, product: Product): Promise<void> {
  const axes = product.variantAxes ?? [];
  const variants = product.variants ?? [];

  const lines = [`🔀 <b>Turlari:</b> ${escapeHtml(product.name)}`];
  if (axes.length > 0) lines.push(`Qatorlar: ${axes.map((axis) => escapeHtml(axis.label)).join(" • ")}`);
  lines.push("");
  if (variants.length === 0) {
    lines.push("Hali tur qo'shilmagan.");
  } else {
    variants.slice(0, MAX_VARIANT_BUTTONS).forEach((variant, index) => {
      const label = escapeHtml(variantLabel(product, variant) || variant.id);
      const code = variant.sku ? ` · kod: ${escapeHtml(variant.sku)}` : "";
      lines.push(`${index + 1}. ${label} — ${formatSom(variant.price)}${code} · ${variant.stock} ta`);
    });
    if (variants.length > MAX_VARIANT_BUTTONS) {
      lines.push(`...va yana ${variants.length - MAX_VARIANT_BUTTONS} ta (saytda ko'rinadi)`);
    }
  }

  const rows: InlineButton[][] = [];
  const shown = variants.slice(0, MAX_VARIANT_BUTTONS);
  for (let i = 0; i < shown.length; i += 2) {
    rows.push(
      shown.slice(i, i + 2).map((variant, j) => ({
        text: `✏️ ${(variantLabel(product, variant) || variant.id).slice(0, 20)}`,
        callback_data: `ap|vr|i:${i + j}`,
      }))
    );
  }
  rows.push([{ text: "➕ Yangi tur", callback_data: "ap|vr|add" }]);
  rows.push([{ text: "⬅️ Orqaga", callback_data: "ap|ef|back" }]);

  await sendChatMessage(session.chatId, lines.join("\n"), {
    replyMarkup: { inline_keyboard: rows },
    threadId: session.threadId,
  });
}

/** Bitta turning ustidagi amallar. */
async function sendVariantActions(
  session: AdminSession,
  product: Product,
  index: number
): Promise<void> {
  const variant = (product.variants ?? [])[index];
  if (!variant) {
    await sendVariantMenu(session, product);
    return;
  }

  await sendChatMessage(
    session.chatId,
    [
      `🔀 <b>${escapeHtml(variantLabel(product, variant) || variant.id)}</b>`,
      `Narx: ${formatSom(variant.price)} | Zaxira: ${variant.stock}${variant.sku ? ` | Kod: ${escapeHtml(variant.sku)}` : ""}`,
      "",
      "Nimani o'zgartiramiz?",
    ].join("\n"),
    {
      replyMarkup: {
        inline_keyboard: [
          [
            { text: "💰 Narx", callback_data: `ap|vf|price:${index}` },
            { text: "📦 Zaxira", callback_data: `ap|vf|stock:${index}` },
          ],
          [
            { text: "#️⃣ Kod", callback_data: `ap|vf|sku:${index}` },
            { text: "🗑 Bunday turi yo'q", callback_data: `ap|vf|del:${index}` },
          ],
          [{ text: "⬅️ Orqaga", callback_data: "ap|vr|list" }],
        ],
      },
      threadId: session.threadId,
    }
  );
}

/** Mahsulotni bazadan o'qish (turlar bilan ishlashda tez-tez kerak). */
async function loadProduct(productId: string): Promise<Product | null> {
  const snap = await getAdminDb().collection("products").doc(productId).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as Product) : null;
}

/**
 * Turlar ro'yxatini saqlaydi va mahsulotning UMUMIY narx/zaxirasini
 * qayta hisoblaydi (narx - eng arzon tur, zaxira - yig'indi).
 *
 * Yangi qiymat qo'shilganda dekart ko'paytmasidan paydo bo'ladigan,
 * lekin HALI KIRITILMAGAN kombinatsiyalar "bunday turi yo'q" deb
 * belgilanadi - aks holda ular kanalda 0 so'm bo'lib chiqib ketardi.
 */
async function saveVariants(
  productId: string,
  axes: VariantAxis[],
  variants: ProductVariant[],
  excluded: string[]
): Promise<void> {
  const filled = normalizeVariants(axes, variants, excluded);
  const blank = filled.variants.filter((variant) => variant.price <= 0).map((variant) => variant.id);
  const clean = blank.length > 0 ? normalizeVariants(axes, variants, [...excluded, ...blank]) : filled;

  const hasRows = clean.variants.length > 0;
  await getAdminDb()
    .collection("products")
    .doc(productId)
    .update({
      variantAxes: hasRows ? clean.axes : [],
      variants: clean.variants,
      variantsExcluded: clean.variantsExcluded,
      ...(hasRows
        ? {
            price: minVariantPrice({ variants: clean.variants }) ?? 0,
            stock: totalVariantStock({ variants: clean.variants }),
          }
        : {}),
      updatedAt: Date.now(),
    });
}

/** "➕ Yangi tur" va tur maydonlariga kelgan matn. */
async function applyVariantValue(
  userId: number,
  session: AdminSession,
  field: string,
  value: string
): Promise<void> {
  if (!session.productId) return;
  const product = await loadProduct(session.productId);
  if (!product) return;

  const reply = (text: string) => sendChatMessage(session.chatId, text, { threadId: session.threadId });

  // 1) Turlari yo'q mahsulotda avval QATOR NOMI so'raladi ("Rangi").
  if (field === "variant_axis") {
    const label = value.trim();
    if (label.length < 2) {
      await reply("Qator nomini yozing (masalan <b>Rangi</b>):");
      return;
    }
    session.draft = { ...session.draft, variantAxes: [{ key: axisKeyOf(label), label, values: [] }] };
    session.editField = "variant_add";
    await saveSession(userId, session);
    await reply(
      [
        `✅ Qator: <b>${escapeHtml(label)}</b>`,
        "",
        "Endi birinchi turni yuboring:",
        "<code>qiymat - narx - soni - kod</code>",
        "Masalan: <code>Satin Gold - 91400 - 5 - SJ-03</code>",
      ].join("\n")
    );
    return;
  }

  // 2) Yangi tur qatori.
  if (field === "variant_add") {
    const parsed = parseVariantLine(value);
    if (!parsed) {
      await reply(
        "Tushunmadim. Shu ko'rinishda yuboring:\n<code>Satin Gold - 91400 - 5 - SJ-03</code>"
      );
      return;
    }
    const axes = (product.variantAxes?.length ? product.variantAxes : session.draft.variantAxes) ?? [];
    if (axes.length === 0) {
      await reply("Avval qator nomini yuboring.");
      return;
    }
    if (parsed.values.length !== axes.length) {
      await reply(
        `Qiymatlar soni mos emas: ${axes.length} ta kerak (${axes
          .map((axis) => escapeHtml(axis.label))
          .join("|")}), siz ${parsed.values.length} ta yubordingiz.`
      );
      return;
    }

    const nextAxes = axes.map((axis, index) => {
      const item = parsed.values[index] ?? "";
      return axis.values.includes(item) ? axis : { ...axis, values: [...axis.values, item] };
    });
    const options: Record<string, string> = {};
    nextAxes.forEach((axis, index) => {
      options[axis.key] = parsed.values[index] ?? "";
    });
    const id = variantIdOf(nextAxes, options);

    const existing = product.variants ?? [];
    const already = existing.some((variant) => variant.id === id);
    const variants = already
      ? existing.map((variant) =>
          variant.id === id
            ? { ...variant, price: parsed.price, stock: parsed.stock, sku: parsed.sku || variant.sku }
            : variant
        )
      : [
          ...existing,
          {
            id,
            options,
            price: parsed.price,
            discountPrice: null,
            stock: parsed.stock,
            ...(parsed.sku ? { sku: parsed.sku } : {}),
          },
        ];

    // Qo'shilgan tur "yo'q" ro'yxatida turgan bo'lsa - qaytariladi.
    const excluded = (product.variantsExcluded ?? []).filter((item) => item !== id);
    await saveVariants(product.id, nextAxes, variants, excluded);
    await reply(already ? "✅ Tur yangilandi." : "✅ Yangi tur qo'shildi.");
    await finishVariantEdit(userId, session);
    return;
  }

  // 3) Mavjud turning narxi / zaxirasi / kodi.
  const [, action, rawIndex] = field.split(":");
  const index = Number(rawIndex);
  const variants = [...(product.variants ?? [])];
  const target = variants[index];
  if (!target) {
    await reply("Bu tur topilmadi.");
    await finishVariantEdit(userId, session);
    return;
  }

  if (action === "price" || action === "stock") {
    const number = parseNumber(value);
    if (Number.isNaN(number) || number < 0) {
      await reply("Faqat musbat son yuboring:");
      return;
    }
    variants[index] =
      action === "price" ? { ...target, price: number } : { ...target, stock: Math.round(number) };
  } else if (action === "sku") {
    variants[index] = { ...target, sku: value.trim() };
  }

  await saveVariants(
    product.id,
    product.variantAxes ?? [],
    variants,
    product.variantsExcluded ?? []
  );
  await reply("✅ Yangilandi.");
  await finishVariantEdit(userId, session);
}

/** Tur o'zgargach: kanaldagi post yangilanadi va turlar oynasi qayta chiziladi. */
async function finishVariantEdit(userId: number, session: AdminSession): Promise<void> {
  session.step = "menu";
  session.editField = undefined;
  session.draft = {};
  await saveSession(userId, session);
  if (!session.productId) return;

  const product = await loadProduct(session.productId);
  if (!product) return;
  // Turlar o'zgarishi ham yakunda bir marta e'lon qilinadi.
  session.pendingAnnounce = true;
  await saveSession(userId, session);
  await sendVariantMenu(session, product);
}

// ---------------------------------------------------------------------------
// TUGMA BOSISHLARI (ap|...)
// ---------------------------------------------------------------------------

/** Admin guruhdagi barcha inline tugmalar (status tugmalaridan tashqari)
 *  shu yerga keladi. Faqat "ap|" prefiksli tugmalarni qayta ishlaymiz. */
export async function handleAdminSessionCallback(params: {
  chatId: number;
  userId: number;
  threadId?: number;
  callbackQueryId: string;
  data: string;
}): Promise<void> {
  const { userId, callbackQueryId, data } = params;

  if (!data.startsWith("ap|")) {
    await answerCallbackQuery(callbackQueryId);
    return;
  }

  const session = await getSession(userId);
  if (!session) {
    await answerCallbackQuery(callbackQueryId, "Sessiya tugagan. Qaytadan boshlang.");
    return;
  }
  session.threadId = session.threadId ?? params.threadId;

  const parts = data.split("|"); // ["ap", action, value?]
  const action = parts[1];
  const value = parts[2] ?? "";

  // Bekor qilish
  if (action === "cancel") {
    /**
     * "Bekor qilish" TAHRIRNI qaytarmaydi - o'zgarishlar bazaga
     * allaqachon yozilgan. Shuning uchun kutayotgan e'lon shu yerda
     * yuboriladi, aks holda kanaldagi post eski holatda qolib
     * ketardi.
     */
    const pending = session.pendingAnnounce && session.productId;
    await clearSession(userId);
    await answerCallbackQuery(callbackQueryId, "Bekor qilindi");
    if (pending && session.productId) {
      const snap = await getAdminDb().collection("products").doc(session.productId).get();
      if (snap.exists) {
        await announceProduct(
          { id: snap.id, ...snap.data() } as Product,
          session.pendingAnnounceMode ?? "refresh"
        ).catch((error) => console.error("Kanalga e'lon (bekor) xatosi:", error));
      }
    }
    await sendChatMessage(session.chatId, "❌ Bekor qilindi.", { threadId: session.threadId });
    return;
  }

  // Tahrirni tugatish
  if (action === "done") {
    await clearSession(userId);
    await answerCallbackQuery(callbackQueryId, "Tayyor ✅");

    // YAKUN = NASHR. Kirimdan kelgan mahsulot shu paytgacha chernovik
    // bo'lib turadi: shu yerda katalogga chiqadi va kanalga e'lon
    // qilinadi. Allaqachon nashr qilingan mahsulot uchun esa postdagi
    // ma'lumot oxirgi holat bilan jimgina yangilanadi.
    let published = false;
    let publishedCode: number | undefined;
    /** Kanal natijasi - xodimga ochiq aytiladi (jimgina yo'qolmasin). */
    let announceResult: AnnounceResult | null = null;
    if (session.productId) {
      const ref = getAdminDb().collection("products").doc(session.productId);
      const snap = await ref.get();
      if (snap.exists) {
        let product = { id: snap.id, ...snap.data() } as Product;
        if (product.isDraft) {
          await ref.update({ isDraft: false, isActive: true, updatedAt: Date.now() });
          product = { ...product, isDraft: false, isActive: true };
          published = true;
          publishedCode = product.code;
          await logAction(
            `📦 Yangi mahsulot (Telegram kirimi): №${product.code} — ${escapeHtml(product.name)}, ${formatSom(product.price)}, ${product.stock} ${product.unit}`
          );
        }
        // Nashr qilinayotgan bo'lsa - albatta; tahrir bo'lsa faqat
        // haqiqatan o'zgargan bo'lsa (keraksiz post yuborilmasin).
        if (published || session.pendingAnnounce) {
          const mode = published ? "new" : (session.pendingAnnounceMode ?? "refresh");
          announceResult = await announceProduct(product, mode).catch((error) => {
            console.error("Kanalga e'lon (yakun) xatosi:", error);
            return "failed" as const;
          });
        }
      }
    }

    /**
     * KANAL NATIJASI OCHIQ YOZILADI.
     *
     * Ilgari bot har doim "✅ Tahrirlash yakunlandi" derdi - post
     * chiqdimi, navbatda turibdimi yoki umuman yiqildimi, bilib
     * bo'lmasdi.
     */
    const channelNote =
      announceResult === "failed"
        ? "\n\n⚠️ Kanalga post chiqmadi — eski post joyida qoldi. Sabab \"Actions\" topikida."
        : announceResult === "queued"
          ? "\n\n⏳ Kanal navbatida — tezlik chegarasi bo'shashi bilan chiqadi."
          : announceResult === "posted"
            ? "\n\n📢 Kanalga yangi post tashlandi."
            : announceResult === "edited"
              ? "\n\n📢 Kanaldagi post yangilandi."
              : "";

    await sendChatMessage(
      session.chatId,
      (published
        ? `✅ <b>Mahsulot katalogga qo'shildi</b> va kanalga e'lon qilindi.\n🆔 ID: <b>${publishedCode ?? "-"}</b>`
        : "✅ Tahrirlash yakunlandi.") + channelNote,
      { threadId: session.threadId }
    );
    return;
  }

  // Kategoriya tanlash
  if (action === "cat") {
    await answerCallbackQuery(callbackQueryId);
    if (session.flow === "new_product") {
      session.draft.category = value as ProductCategory;
      await advanceNewProduct(userId, session);
    } else if (session.flow === "edit_product" && session.productId) {
      await getAdminDb().collection("products").doc(session.productId).update({ category: value, updatedAt: Date.now() });
      await reloadEditMenu(userId, session, true);
    }
    return;
  }

  // Material tanlash
  if (action === "mat") {
    await answerCallbackQuery(callbackQueryId);
    if (session.flow === "new_product") {
      session.draft.material = value as ProductMaterial;
      await advanceNewProduct(userId, session);
    } else if (session.flow === "edit_product" && session.productId) {
      await getAdminDb().collection("products").doc(session.productId).update({ material: value, updatedAt: Date.now() });
      await reloadEditMenu(userId, session, true);
    }
    return;
  }

  // Sotish turi tanlash
  if (action === "unt") {
    await answerCallbackQuery(callbackQueryId);
    if (session.flow === "new_product") {
      session.draft.unit = value;
      await advanceNewProduct(userId, session);
    } else if (session.flow === "edit_product" && session.productId) {
      await getAdminDb().collection("products").doc(session.productId).update({ unit: value, updatedAt: Date.now() });
      await reloadEditMenu(userId, session, true);
    }
    return;
  }

  // Optional bosqichni o'tkazish (yangi mahsulot)
  if (action === "skip" && session.flow === "new_product") {
    await answerCallbackQuery(callbackQueryId, "O'tkazildi");
    await advanceNewProduct(userId, session);
    return;
  }

  // TURLAR oynasi
  if (action === "vr") {
    await answerCallbackQuery(callbackQueryId);
    if (!session.productId) return;
    const product = await loadProduct(session.productId);
    if (!product) return;

    if (value === "list") {
      session.step = "menu";
      session.editField = undefined;
      await saveSession(userId, session);
      await sendVariantMenu(session, product);
      return;
    }

    if (value === "add") {
      session.step = "edit_value";
      // Turlari yo'q mahsulotda avval QATOR NOMI so'raladi.
      const hasAxes = (product.variantAxes?.length ?? 0) > 0;
      session.editField = hasAxes ? "variant_add" : "variant_axis";
      await saveSession(userId, session);
      await sendChatMessage(
        session.chatId,
        hasAxes
          ? [
              "Yangi turni bitta qatorda yuboring:",
              "<code>qiymat - narx - soni - kod</code>",
              `Qatorlar: <b>${(product.variantAxes ?? []).map((axis) => escapeHtml(axis.label)).join("|")}</b>`,
              (product.variantAxes?.length ?? 0) > 1
                ? "Qiymatlarni <code>|</code> bilan ajrating: <code>50x60|Oq - 96000 - 3 - BS7677</code>"
                : "Masalan: <code>Satin Gold - 91400 - 5 - SJ-03</code>",
            ].join("\n")
          : [
              "Bu mahsulotda hali turlar yo'q.",
              "",
              "Qator nomini yuboring — mijoz nimani tanlaydi?",
              "Masalan: <b>Rangi</b>, <b>O'lcham</b>, <b>Qalinlik</b>",
            ].join("\n"),
        { threadId: session.threadId }
      );
      return;
    }

    if (value.startsWith("i:")) {
      const index = Number(value.slice(2));
      session.variantIndex = index;
      await saveSession(userId, session);
      await sendVariantActions(session, product, index);
      return;
    }
    return;
  }

  // Bitta tur ustidagi amal
  if (action === "vf") {
    await answerCallbackQuery(callbackQueryId);
    if (!session.productId) return;
    const product = await loadProduct(session.productId);
    if (!product) return;

    const [what, rawIndex] = value.split(":");
    const index = Number(rawIndex);
    const variant = (product.variants ?? [])[index];
    if (!variant) {
      await sendVariantMenu(session, product);
      return;
    }

    // "Bunday turi yo'q": ro'yxatdan olib tashlanadi va QAYTA
    // yasalmaydi (kaliti `variantsExcluded` ga tushadi).
    if (what === "del") {
      const variants = (product.variants ?? []).filter((item) => item.id !== variant.id);
      await saveVariants(
        product.id,
        product.variantAxes ?? [],
        variants,
        [...(product.variantsExcluded ?? []), variant.id]
      );
      await sendChatMessage(session.chatId, "🗑 Tur olib tashlandi.", { threadId: session.threadId });
      await finishVariantEdit(userId, session);
      return;
    }

    session.step = "edit_value";
    session.editField = `v:${what}:${index}`;
    await saveSession(userId, session);
    const prompt =
      what === "price"
        ? "Shu turning yangi <b>narx</b>ini yuboring (so'mda):"
        : what === "stock"
          ? "Shu turning <b>zaxira</b> sonini yuboring:"
          : "Shu turning <b>kodi</b>ni (artikul) yuboring:";
    await sendChatMessage(session.chatId, prompt, { threadId: session.threadId });
    return;
  }

  // Tahrirlash uchun maydon tanlandi
  if (action === "ph") {
    await answerCallbackQuery(callbackQueryId);

    if (value === "add") {
      session.step = "edit_value";
      session.editField = "photo";
      await saveSession(userId, session);
      await sendChatMessage(session.chatId, "🖼 Yangi <b>rasmni</b> yuboring:", {
        threadId: session.threadId,
      });
      return;
    }

    if (value?.startsWith("del:") && session.productId) {
      const index = Number(value.slice(4));
      const updated = await detachProductPhoto(session.productId, index).catch((error) => {
        console.error("Rasmni o'chirishda xato:", error);
        return null;
      });

      if (!updated) {
        await sendChatMessage(session.chatId, "⚠️ Rasmni o'chirib bo'lmadi.", {
          threadId: session.threadId,
        });
        return;
      }

      await sendChatMessage(
        session.chatId,
        `🗑 Rasm o'chirildi. Qoldi: ${updated.images?.length ?? 0} ta.`,
        { threadId: session.threadId }
      );

      /**
       * Kanalga hozir TEGILMAYDI - "✅ Tugatish" bosilganda bir
       * marta yangilanadi. Aks holda har rasm o'chirilganda kanalga
       * yangi post ketardi (rasm soni o'zgargani uchun post qayta
       * tashlanadi) va kanal yarim tahrirlangan nusxalar bilan
       * to'lib ketardi.
       */
      session.pendingAnnounce = true;
      await saveSession(userId, session);

      await sendPhotoMenu(session, updated);
      return;
    }

    return;
  }

  // VIDEO menyusi (rasm menyusi bilan bir xil mantiq).
  if (action === "vd") {
    await answerCallbackQuery(callbackQueryId);

    if (value === "add") {
      session.step = "edit_value";
      session.editField = "video";
      await saveSession(userId, session);
      await sendChatMessage(
        session.chatId,
        "🎬 <b>Videoni</b> yuboring (20 MB gacha). U saytdagi galereyada ko'rinadi.",
        { threadId: session.threadId }
      );
      return;
    }

    if (value?.startsWith("del:") && session.productId) {
      const index = Number(value.slice(4));
      const updated = await detachProductVideo(session.productId, index).catch((error) => {
        console.error("Videoni o'chirishda xato:", error);
        return null;
      });

      if (!updated) {
        await sendChatMessage(session.chatId, "⚠️ Videoni o'chirib bo'lmadi.", {
          threadId: session.threadId,
        });
        return;
      }

      await sendChatMessage(
        session.chatId,
        `🗑 Video o'chirildi. Qoldi: ${updated.videos?.length ?? 0} ta.`,
        { threadId: session.threadId }
      );

      // Kanalga hozir tegilmaydi - "✅ Tugatish" da bir marta.
      session.pendingAnnounce = true;
      await saveSession(userId, session);

      await sendVideoMenu(session, updated);
      return;
    }

    return;
  }

  if (action === "ef") {
    await answerCallbackQuery(callbackQueryId);
    if (value === "category") {
      await sendChatMessage(session.chatId, "Yangi <b>kategoriya</b>ni tanlang:", {
        replyMarkup: {
          inline_keyboard: [...(await categoryKeyboard("ap|cat|")), [{ text: "⬅️ Orqaga", callback_data: "ap|ef|back" }]],
        },
        threadId: session.threadId,
      });
      return;
    }
    if (value === "unit") {
      await sendChatMessage(session.chatId, "Yangi <b>sotish turi</b>ni tanlang:", {
        replyMarkup: {
          inline_keyboard: [...(await unitKeyboard("ap|unt|")), [{ text: "⬅️ Orqaga", callback_data: "ap|ef|back" }]],
        },
        threadId: session.threadId,
      });
      return;
    }
    if (value === "material") {
      await sendChatMessage(session.chatId, "Yangi <b>material</b>ni tanlang:", {
        replyMarkup: {
          inline_keyboard: [...(await materialKeyboard("ap|mat|")), [{ text: "⬅️ Orqaga", callback_data: "ap|ef|back" }]],
        },
        threadId: session.threadId,
      });
      return;
    }
    if (value === "back") {
      await reloadEditMenu(userId, session);
      return;
    }
    if (value === "photo") {
      // Rasm uchun alohida menyu: qo'shish yoki o'chirish.
      const snap = session.productId
        ? await getAdminDb().collection("products").doc(session.productId).get()
        : null;
      if (snap?.exists) {
        await sendPhotoMenu(session, { id: snap.id, ...snap.data() } as Product);
        return;
      }
    }
    if (value === "video") {
      // Video uchun alohida menyu: qo'shish yoki o'chirish.
      const snap = session.productId
        ? await getAdminDb().collection("products").doc(session.productId).get()
        : null;
      if (snap?.exists) {
        await sendVideoMenu(session, { id: snap.id, ...snap.data() } as Product);
        return;
      }
    }
    // Matn/son kutiladigan maydon
    session.step = "edit_value";
    session.editField = value;
    await saveSession(userId, session);
    await sendChatMessage(session.chatId, EDIT_VALUE_PROMPTS[value] ?? "Yangi qiymatni yuboring:", {
      threadId: session.threadId,
    });
    return;
  }

  await answerCallbackQuery(callbackQueryId);
}

async function reloadEditMenu(
  userId: number,
  session: AdminSession,
  /** Mahsulot o'zgargan bo'lsa - kanaldagi e'lon ham yangilanadi. */
  changed = false
): Promise<void> {
  session.step = "menu";
  session.editField = undefined;
  await saveSession(userId, session);
  if (!session.productId) return;
  const snap = await getAdminDb().collection("products").doc(session.productId).get();
  if (!snap.exists) return;

  const product = { id: snap.id, ...snap.data() } as Product;
  if (changed) {
    /**
     * E'LON DARHOL YUBORILMAYDI.
     *
     * Ilgari har bir o'zgarish (nom, narx, rasm qo'shish/o'chirish)
     * kanaldagi postni SHU ZAHOTI yangilardi. Xodim ketma-ket bir
     * necha maydonni tahrirlasa kanalga bir necha marta post ketardi
     * va yarim tahrirlangan holat ham chiqib qolardi.
     *
     * Endi o'zgarish faqat BELGILANADI, e'lon esa "✅ Tugatish"
     * bosilganda (yoki bekor qilinganda) BIR MARTA yuboriladi.
     */
    session.pendingAnnounce = true;
    await saveSession(userId, session);
  }
  await sendEditMenu(session, product);
}
