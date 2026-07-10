import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendChatMessage, answerCallbackQuery, downloadTelegramFile } from "./bot";
import { uploadImageAdmin } from "@/lib/firebase/admin-storage";
import { buildNameTokens } from "@/lib/search/tokens";
import type { Product, ProductCategory, ProductMaterial } from "@/types/product";

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

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  pipes: "🔧 Quvurlar",
  fittings: "🔩 Muftalar",
  faucets: "🚰 Kranlar",
  "shower-systems": "🚿 Dush tizimlari",
  boilers: "🔥 Isitish qozonlari",
  radiators: "🌡 Radiatorlar",
  pumps: "⚙️ Nasoslar",
  "sanitary-ware": "🚽 Santexnika",
};

const MATERIAL_LABELS: Record<ProductMaterial, string> = {
  polypropylene: "Polipropilen",
  "metal-plastic": "Metalloplastik",
  steel: "Po'lat",
  copper: "Mis",
  brass: "Latun",
  "cast-iron": "Cho'yan",
  pvc: "PVX",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.netlify.app";

// Yangi mahsulot oqimi bosqichlari tartibi.
const NEW_STEPS = ["name", "category", "price", "stock", "brand", "country", "material", "description", "photo"] as const;
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

interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

interface AdminSession {
  flow: "new_product" | "edit_product";
  step: string;
  chatId: number;
  threadId?: number;
  draft: Partial<Product>;
  productId?: string;
  editField?: string;
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

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

function parseNumber(text: string): number {
  return Number(text.replace(/[\s,]/g, ""));
}

const cancelButton: InlineButton = { text: "✖️ Bekor qilish", callback_data: "ap|cancel" };
const skipButton: InlineButton = { text: "⏭ O'tkazish", callback_data: "ap|skip" };

function categoryKeyboard(prefix: string): InlineButton[][] {
  const cats = Object.entries(CATEGORY_LABELS) as [ProductCategory, string][];
  const rows: InlineButton[][] = [];
  for (let i = 0; i < cats.length; i += 2) {
    rows.push(
      cats.slice(i, i + 2).map(([value, label]) => ({ text: label, callback_data: `${prefix}${value}` }))
    );
  }
  return rows;
}

function materialKeyboard(prefix: string): InlineButton[][] {
  const mats = Object.entries(MATERIAL_LABELS) as [ProductMaterial, string][];
  const rows: InlineButton[][] = [];
  for (let i = 0; i < mats.length; i += 2) {
    rows.push(
      mats.slice(i, i + 2).map(([value, label]) => ({ text: label, callback_data: `${prefix}${value}` }))
    );
  }
  return rows;
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
        replyMarkup: { inline_keyboard: [...categoryKeyboard("ap|cat|"), [cancelButton]] },
        ...opts,
      });
      return;
    case "price":
      await sendChatMessage(session.chatId, `${head}\n\n<b>Narx</b>ini yuboring (so'mda, masalan 45000):`, {
        replyMarkup: { inline_keyboard: [[cancelButton]] },
        ...opts,
      });
      return;
    case "stock":
      await sendChatMessage(session.chatId, `${head}\n\n<b>Zaxira</b> sonini yuboring (masalan 30):`, {
        replyMarkup: { inline_keyboard: [[cancelButton]] },
        ...opts,
      });
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
        replyMarkup: { inline_keyboard: [...materialKeyboard("ap|mat|"), [skipButton], [cancelButton]] },
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

  await sendChatMessage(
    session.chatId,
    [
      `✅ <b>Qo'shildi:</b> ${product.name}`,
      `ID: <code>${ref.id}</code>`,
      `Kategoriya: ${CATEGORY_LABELS[product.category]}`,
      `Narx: ${formatSom(product.price)} | Zaxira: ${product.stock} dona`,
      product.brand ? `Brend: ${product.brand}` : "",
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
  { field: "description", label: "📝 Tavsif" },
  { field: "photo", label: "🖼 Rasm" },
];

async function sendEditMenu(session: AdminSession, product: Product): Promise<void> {
  const rows: InlineButton[][] = [];
  for (let i = 0; i < EDIT_FIELDS.length; i += 2) {
    rows.push(EDIT_FIELDS.slice(i, i + 2).map((f) => ({ text: f.label, callback_data: `ap|ef|${f.field}` })));
  }
  rows.push([{ text: "✅ Tugatish", callback_data: "ap|done" }]);

  await sendChatMessage(
    session.chatId,
    [
      `✏️ <b>Tahrirlash:</b> ${product.name}`,
      `ID: <code>${product.id}</code>`,
      `Narx: ${formatSom(product.price)} | Zaxira: ${product.stock} dona`,
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
  productId: string
): Promise<boolean> {
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
}): Promise<boolean> {
  const { chatId, userId, text, photoFileId } = params;
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
    if (session.productId) {
      try {
        await attachTelegramPhoto(session.productId, photoFileId);
        await sendChatMessage(chatId, "🖼 Rasm yangilandi ✅", { threadId: session.threadId });
      } catch (error) {
        console.error("Rasm yangilashda xato:", error);
        await sendChatMessage(chatId, "⚠️ Rasm yuklanmadi. Qayta urinib ko'ring.", { threadId: session.threadId });
      }
    }
    await reloadEditMenu(userId, session);
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

  if (step === "category" || step === "material") {
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
  } else if (field === "brand") {
    updates.brand = value;
  } else if (field === "country") {
    updates.manufacturerCountry = value;
  } else if (field === "description") {
    updates.description = value;
  }

  if (!session.productId) return;
  await getAdminDb().collection("products").doc(session.productId).update(updates);
  // Menyuga qaytamiz.
  session.step = "menu";
  session.editField = undefined;
  await saveSession(userId, session);
  const snap = await getAdminDb().collection("products").doc(session.productId).get();
  await sendChatMessage(session.chatId, "✅ Yangilandi.", { threadId: session.threadId });
  if (snap.exists) await sendEditMenu(session, { id: snap.id, ...snap.data() } as Product);
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
    await clearSession(userId);
    await answerCallbackQuery(callbackQueryId, "Bekor qilindi");
    await sendChatMessage(session.chatId, "❌ Bekor qilindi.", { threadId: session.threadId });
    return;
  }

  // Tahrirni tugatish
  if (action === "done") {
    await clearSession(userId);
    await answerCallbackQuery(callbackQueryId, "Tayyor ✅");
    await sendChatMessage(session.chatId, "✅ Tahrirlash yakunlandi.", { threadId: session.threadId });
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
      await reloadEditMenu(userId, session);
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
      await reloadEditMenu(userId, session);
    }
    return;
  }

  // Optional bosqichni o'tkazish (yangi mahsulot)
  if (action === "skip" && session.flow === "new_product") {
    await answerCallbackQuery(callbackQueryId, "O'tkazildi");
    await advanceNewProduct(userId, session);
    return;
  }

  // Tahrirlash uchun maydon tanlandi
  if (action === "ef") {
    await answerCallbackQuery(callbackQueryId);
    if (value === "category") {
      await sendChatMessage(session.chatId, "Yangi <b>kategoriya</b>ni tanlang:", {
        replyMarkup: { inline_keyboard: [...categoryKeyboard("ap|cat|"), [{ text: "⬅️ Orqaga", callback_data: "ap|ef|back" }]] },
        threadId: session.threadId,
      });
      return;
    }
    if (value === "material") {
      await sendChatMessage(session.chatId, "Yangi <b>material</b>ni tanlang:", {
        replyMarkup: { inline_keyboard: [...materialKeyboard("ap|mat|"), [{ text: "⬅️ Orqaga", callback_data: "ap|ef|back" }]] },
        threadId: session.threadId,
      });
      return;
    }
    if (value === "back") {
      await reloadEditMenu(userId, session);
      return;
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

async function reloadEditMenu(userId: number, session: AdminSession): Promise<void> {
  session.step = "menu";
  session.editField = undefined;
  await saveSession(userId, session);
  if (!session.productId) return;
  const snap = await getAdminDb().collection("products").doc(session.productId).get();
  if (snap.exists) await sendEditMenu(session, { id: snap.id, ...snap.data() } as Product);
}
