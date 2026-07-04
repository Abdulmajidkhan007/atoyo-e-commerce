import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  sendChatMessage,
  answerCallbackQuery,
  sendChatMessageWithReplyKeyboard,
  removeReplyKeyboard,
  isChatMember,
} from "./bot";
import { getRequiredChannels } from "./required-channels";
import { createOrder } from "@/lib/orders/create-order";
import type { Product, ProductCategory } from "@/types/product";
import type { OrderItem } from "@/types/order";

/**
 * MIJOZ-BOT - FAQAT shaxsiy (private) chatlarda ishlaydi. Webhook bu
 * modulni faqat chat.type === "private" bo'lganda chaqiradi, shuning
 * uchun bu oqim admin guruh buyruqlariga hech qanday yo'l ochmaydi.
 *
 * Kirish shartlari (avval ro'yxatdan o'tish, keyin majburiy kanallar):
 *   1) Botdan foydalanish uchun mijoz avval telefon raqamini yuborib
 *      (yoki saytda ro'yxatdan o'tib) tasdiqlanishi kerak - `botUsers`.
 *   2) Admin belgilagan majburiy kanallarga obuna bo'lishi kerak.
 * Ikkalasi bajarilmaguncha katalog ochilmaydi.
 *
 * Holat mashinasi Firestore `botSessions/{chatId}` hujjatida saqlanadi.
 */

const PAGE_SIZE = 6;

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  pipes: "🔧 Quvurlar",
  fittings: "🔩 Muftalar",
  faucets: "🚰 Kranlar",
  "shower-systems": "🚿 Dush tizimlari",
  boilers: "🔥 Isitish qozonlari",
  radiators: "🌡 Radiatorlar",
  pumps: "⚙️ Nasoslar",
  "sanitary-ware": "🚽 Santexnika buyumlari",
};

interface BotSession {
  state: "idle" | "awaiting_checkout_name" | "awaiting_phone";
  cart: OrderItem[];
  customerName?: string;
  updatedAt: number;
}

interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.netlify.app";

// next/og orqali serverda generatsiya qilinadigan brendlangan rasmlar.
const WELCOME_IMAGE_URL = `${SITE_URL}/api/og/welcome`;
function profileImageUrl(name: string, phone: string): string {
  const q = new URLSearchParams({ name, phone });
  return `${SITE_URL}/api/og/profile?${q.toString()}`;
}

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

interface BotUser {
  chatId: number;
  userId: number;
  phoneNumber: string;
  name: string;
  registeredAt: number;
}

async function getBotUser(userId: number): Promise<BotUser | null> {
  const doc = await getAdminDb().collection("botUsers").doc(String(userId)).get();
  return doc.exists ? (doc.data() as BotUser) : null;
}

/**
 * KIRISH DARVOZASI: mijoz ro'yxatdan o'tganmi va majburiy kanallarga
 * obuna bo'lganmi. Bajarilmagan bo'lsa - tegishli so'rovni yuboradi va
 * `false` qaytaradi (chaqiruvchi to'xtaydi).
 */
async function ensureAccess(chatId: number, userId: number): Promise<boolean> {
  // 1-shart: ro'yxatdan o'tish (telefon)
  const user = await getBotUser(userId);
  if (!user) {
    await promptRegistration(chatId);
    return false;
  }

  // 2-shart: majburiy kanallarga obuna
  const channels = await getRequiredChannels();
  if (channels.length > 0) {
    const notJoined: typeof channels = [];
    for (const ch of channels) {
      const member = await isChatMember(ch.chatId, userId);
      if (!member) notJoined.push(ch);
    }
    if (notJoined.length > 0) {
      await promptChannels(chatId, notJoined);
      return false;
    }
  }

  return true;
}

async function promptRegistration(chatId: number): Promise<void> {
  await sendChatMessageWithReplyKeyboard(
    chatId,
    [
      "👋 <b>Atoyo Santexnika</b> botiga xush kelibsiz!",
      "",
      "Botdan foydalanish uchun avval ro'yxatdan o'ting.",
      "Quyidagi tugma orqali telefon raqamingizni yuboring 👇",
      "",
      `Yoki sayt orqali ro'yxatdan o'ting: ${SITE_URL}/kirish`,
    ].join("\n"),
    [[{ text: "📞 Telefon raqamni yuborish", request_contact: true }]]
  );
}

async function promptChannels(
  chatId: number,
  channels: { title: string; url: string }[]
): Promise<void> {
  const rows: InlineButton[][] = channels
    .filter((c) => c.url)
    .map((c) => [{ text: `📢 ${c.title}`, url: c.url }]);
  rows.push([{ text: "✅ Tekshirish", callback_data: "chk_sub" }]);

  await sendChatMessage(
    chatId,
    [
      "📢 <b>Botdan foydalanish uchun kanallarimizga obuna bo'ling:</b>",
      "",
      "Barcha kanallarga obuna bo'lgach, <b>✅ Tekshirish</b> tugmasini bosing.",
    ].join("\n"),
    { replyMarkup: { inline_keyboard: rows } }
  );
}

/** Telefon kontakti kelganda mijozni ro'yxatdan o'tkazadi. */
async function registerWithContact(params: {
  chatId: number;
  userId: number;
  phoneNumber: string;
  name: string;
}): Promise<void> {
  const { chatId, userId, phoneNumber, name } = params;
  const botUser: BotUser = {
    chatId,
    userId,
    phoneNumber: phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`,
    name,
    registeredAt: Date.now(),
  };
  await getAdminDb().collection("botUsers").doc(String(userId)).set(botUser);
  await removeReplyKeyboard(chatId, "✅ Ro'yxatdan o'tdingiz!");
  // Ro'yxatdan keyin darvozani qayta ishga solamiz (kanallar tekshiriladi).
  if (await ensureAccess(chatId, userId)) {
    await sendGreeting(chatId);
  }
}

async function getSession(chatId: number): Promise<BotSession> {
  const doc = await getAdminDb().collection("botSessions").doc(String(chatId)).get();
  const data = doc.data() as BotSession | undefined;
  return data ?? { state: "idle", cart: [], updatedAt: Date.now() };
}

async function saveSession(chatId: number, session: BotSession): Promise<void> {
  await getAdminDb()
    .collection("botSessions")
    .doc(String(chatId))
    .set({ ...session, updatedAt: Date.now() });
}

function mainMenuKeyboard(): { inline_keyboard: InlineButton[][] } {
  return {
    inline_keyboard: [
      [{ text: "🛍 Katalog", callback_data: "m|cat" }],
      [
        { text: "🛒 Savat", callback_data: "crt" },
        { text: "👤 Profil", callback_data: "prof" },
      ],
    ],
  };
}

/** Salomlashuv: generatsiya qilingan banner rasm + asosiy menyu (/start). */
async function sendGreeting(chatId: number): Promise<void> {
  await sendChatMessage(
    chatId,
    "🏪 <b>Atoyo Santexnika</b> botiga xush kelibsiz!\n\nKatalogdan mahsulot tanlab, shu yerning o'zida buyurtma bering.",
    { replyMarkup: mainMenuKeyboard(), photoUrl: WELCOME_IMAGE_URL }
  );
}

async function showMainMenu(chatId: number): Promise<void> {
  await sendChatMessage(
    chatId,
    "🏪 <b>Bosh menyu</b>\n\nKatalogdan mahsulot tanlab, shu yerning o'zida buyurtma bering.",
    { replyMarkup: mainMenuKeyboard() }
  );
}

/** Mijoz profili: generatsiya qilingan profil kartasi rasmi + ma'lumot. */
async function showProfile(chatId: number, userId: number): Promise<void> {
  const user = await getBotUser(userId);
  if (!user) {
    await promptRegistration(chatId);
    return;
  }
  const registered = new Date(user.registeredAt).toLocaleDateString("uz-UZ");
  await sendChatMessage(
    chatId,
    [
      `👤 <b>${user.name}</b>`,
      `📞 ${user.phoneNumber}`,
      `🗓 Ro'yxatdan o'tgan: ${registered}`,
      ``,
      `Sozlamalarni saytdan o'zgartirishingiz mumkin: ${SITE_URL}/profil`,
    ].join("\n"),
    {
      photoUrl: profileImageUrl(user.name, user.phoneNumber),
      replyMarkup: { inline_keyboard: [[{ text: "🛍 Katalog", callback_data: "m|cat" }, { text: "⬅️ Bosh menyu", callback_data: "m|home" }]] },
    }
  );
}

async function showCategories(chatId: number): Promise<void> {
  const rows = (Object.entries(CATEGORY_LABELS) as [ProductCategory, string][]).map(([value, label]) => [
    { text: label, callback_data: `c|${value}|0` },
  ]);
  rows.push([{ text: "⬅️ Bosh menyu", callback_data: "m|home" }]);
  await sendChatMessage(chatId, "Kategoriyani tanlang:", { replyMarkup: { inline_keyboard: rows } });
}

async function showCategoryPage(chatId: number, category: ProductCategory, page: number): Promise<void> {
  const snapshot = await getAdminDb()
    .collection("products")
    .where("isActive", "==", true)
    .where("category", "==", category)
    .orderBy("createdAt", "desc")
    .offset(page * PAGE_SIZE)
    .limit(PAGE_SIZE + 1)
    .get();

  if (snapshot.empty && page === 0) {
    await sendChatMessage(chatId, "Bu kategoriyada hozircha mahsulot yo'q.", {
      replyMarkup: { inline_keyboard: [[{ text: "⬅️ Kategoriyalar", callback_data: "m|cat" }]] },
    });
    return;
  }

  const hasMore = snapshot.docs.length > PAGE_SIZE;
  const products = snapshot.docs.slice(0, PAGE_SIZE).map((d) => ({ id: d.id, ...d.data() }) as Product);

  const rows: InlineButton[][] = products.map((p) => [
    { text: `${p.name} — ${formatSom(p.discountPrice ?? p.price)}`, callback_data: `p|${p.id}` },
  ]);

  const nav: InlineButton[] = [];
  if (page > 0) nav.push({ text: "⬅️", callback_data: `c|${category}|${page - 1}` });
  nav.push({ text: "📂 Kategoriyalar", callback_data: "m|cat" });
  if (hasMore) nav.push({ text: "➡️", callback_data: `c|${category}|${page + 1}` });
  rows.push(nav);

  await sendChatMessage(chatId, `<b>${CATEGORY_LABELS[category]}</b> — ${page + 1}-sahifa:`, {
    replyMarkup: { inline_keyboard: rows },
  });
}

async function showProduct(chatId: number, productId: string): Promise<void> {
  const doc = await getAdminDb().collection("products").doc(productId).get();
  if (!doc.exists) {
    await sendChatMessage(chatId, "Mahsulot topilmadi.");
    return;
  }
  const product = { id: doc.id, ...doc.data() } as Product;
  const price = product.discountPrice ?? product.price;

  const lines = [
    `<b>${product.name}</b>`,
    product.brand ? `Brend: ${product.brand}${product.manufacturerCountry ? ` (${product.manufacturerCountry})` : ""}` : "",
    `Narx: <b>${formatSom(price)}</b>${product.discountPrice ? ` <s>${formatSom(product.price)}</s>` : ""}`,
    product.stock > 0 ? `Zaxirada: ${product.stock} dona` : "❌ Hozircha tugagan",
    product.description ? `\n${product.description}` : "",
  ].filter(Boolean);

  const rows: InlineButton[][] = [];
  if (product.stock > 0) rows.push([{ text: "🛒 Savatga qo'shish", callback_data: `a|${product.id}` }]);
  rows.push([
    { text: "⬅️ Orqaga", callback_data: `c|${product.category}|0` },
    { text: "🛒 Savat", callback_data: "crt" },
  ]);

  await sendChatMessage(chatId, lines.join("\n"), {
    replyMarkup: { inline_keyboard: rows },
    photoUrl: product.thumbnailUrl || undefined,
  });
}

async function addToCart(chatId: number, productId: string): Promise<string> {
  const doc = await getAdminDb().collection("products").doc(productId).get();
  if (!doc.exists) return "Mahsulot topilmadi.";
  const product = { id: doc.id, ...doc.data() } as Product;
  if (product.stock <= 0) return "Bu mahsulot tugagan.";

  const session = await getSession(chatId);
  const existing = session.cart.find((i) => i.productId === productId);
  if (existing) {
    if (existing.quantity >= product.stock) return "Zaxiradan ortiq qo'shib bo'lmaydi.";
    existing.quantity += 1;
  } else {
    session.cart.push({
      productId: product.id,
      name: product.name,
      price: product.discountPrice ?? product.price,
      quantity: 1,
      thumbnailUrl: product.thumbnailUrl,
    });
  }
  await saveSession(chatId, session);
  return `✅ Savatga qo'shildi (${session.cart.reduce((s, i) => s + i.quantity, 0)} dona).`;
}

async function showCart(chatId: number): Promise<void> {
  const session = await getSession(chatId);
  if (session.cart.length === 0) {
    await sendChatMessage(chatId, "🛒 Savatingiz bo'sh.", {
      replyMarkup: { inline_keyboard: [[{ text: "🛍 Katalogga o'tish", callback_data: "m|cat" }]] },
    });
    return;
  }

  const total = session.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const lines = session.cart.map((i) => `• ${i.name} — ${i.quantity} x ${formatSom(i.price)}`);
  lines.push(`\n<b>Jami: ${formatSom(total)}</b>`);

  await sendChatMessage(chatId, `🛒 <b>Savatingiz</b>\n\n${lines.join("\n")}`, {
    replyMarkup: {
      inline_keyboard: [
        [{ text: "✅ Buyurtma berish", callback_data: "chk" }],
        [
          { text: "🗑 Tozalash", callback_data: "clr" },
          { text: "🛍 Davom etish", callback_data: "m|cat" },
        ],
      ],
    },
  });
}

async function finishOrder(chatId: number, userId: number, customerName: string): Promise<void> {
  const session = await getSession(chatId);
  if (session.cart.length === 0) {
    await showCart(chatId);
    return;
  }
  const botUser = await getBotUser(userId);
  const order = await createOrder({
    customerName,
    phoneNumber: botUser?.phoneNumber ?? "",
    items: session.cart,
    customerChatId: chatId,
  });

  await saveSession(chatId, { state: "idle", cart: [], updatedAt: Date.now() });
  await sendChatMessage(
    chatId,
    [
      `🎉 Buyurtmangiz qabul qilindi!`,
      `Raqami: <b>#${order.id.slice(0, 8)}</b>`,
      `Jami: <b>${formatSom(order.totalAmount)}</b>`,
      ``,
      `Holati o'zgarishi bilan shu chatda xabar beramiz. Rahmat! 🙌`,
    ].join("\n"),
    { replyMarkup: mainMenuKeyboard() }
  );
}

async function startCheckout(chatId: number, userId: number): Promise<void> {
  const session = await getSession(chatId);
  if (session.cart.length === 0) {
    await showCart(chatId);
    return;
  }
  const botUser = await getBotUser(userId);
  // Ro'yxatdan o'tishda ism olingan - tasdiqlash yoki o'zgartirish taklif qilinadi.
  session.state = "awaiting_checkout_name";
  session.customerName = botUser?.name;
  await saveSession(chatId, session);
  await sendChatMessage(
    chatId,
    `👤 Buyurtma uchun ism-familiyangizni tasdiqlang yoki qaytadan yozing:\n\nJoriy: <b>${botUser?.name ?? "—"}</b>`,
    { replyMarkup: { inline_keyboard: [[{ text: `✅ ${botUser?.name ?? "Tasdiqlash"}`, callback_data: "cfm_name" }]] } }
  );
}

/** Shaxsiy chatdagi matnli/kontaktli xabarlar. */
export async function handleCustomerMessage(params: {
  chatId: number;
  userId: number;
  text?: string;
  contact?: { phone_number: string; first_name?: string; last_name?: string };
}): Promise<void> {
  const { chatId, userId, text, contact } = params;

  // Telefon kontakti kelsa - ro'yxatdan o'tkazamiz.
  if (contact?.phone_number) {
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() || "Mijoz";
    await registerWithContact({ chatId, userId, phoneNumber: contact.phone_number, name });
    return;
  }

  // Kirish darvozasi (ro'yxat + kanallar) - o'tmaguncha oldinga o'tmaydi.
  if (!(await ensureAccess(chatId, userId))) return;

  const session = await getSession(chatId);

  // Checkout: ism qadamida yozilgan matn yangi ism sifatida qabul qilinadi.
  if (session.state === "awaiting_checkout_name" && text) {
    const name = text.trim();
    if (name.startsWith("/")) {
      await showMainMenu(chatId);
      return;
    }
    if (name.length < 2) {
      await sendChatMessage(chatId, "Iltimos, to'liq ism-familiyangizni yozing:");
      return;
    }
    await finishOrder(chatId, userId, name);
    return;
  }

  // Buyruqlar
  const command = text?.trim().toLowerCase();
  if (command === "/profil") {
    await showProfile(chatId, userId);
    return;
  }
  if (command === "/start") {
    await sendGreeting(chatId);
    return;
  }

  await showMainMenu(chatId);
}

/** Shaxsiy chatdagi inline tugma bosishlari. */
export async function handleCustomerCallback(params: {
  chatId: number;
  userId: number;
  callbackQueryId: string;
  data: string;
}): Promise<void> {
  const { chatId, userId, callbackQueryId, data } = params;
  const [action, arg1, arg2] = data.split("|");

  // "Tekshirish" tugmasi - obuna qayta tekshiriladi.
  if (action === "chk_sub") {
    await answerCallbackQuery(callbackQueryId);
    if (await ensureAccess(chatId, userId)) await showMainMenu(chatId);
    return;
  }

  // Boshqa barcha amallar uchun kirish darvozasidan o'tish shart.
  if (!(await ensureAccess(chatId, userId))) {
    await answerCallbackQuery(callbackQueryId);
    return;
  }

  switch (action) {
    case "m": {
      await answerCallbackQuery(callbackQueryId);
      if (arg1 === "cat") await showCategories(chatId);
      else await showMainMenu(chatId);
      return;
    }
    case "c": {
      await answerCallbackQuery(callbackQueryId);
      await showCategoryPage(chatId, arg1 as ProductCategory, Number(arg2 ?? 0));
      return;
    }
    case "p": {
      await answerCallbackQuery(callbackQueryId);
      await showProduct(chatId, arg1 ?? "");
      return;
    }
    case "a": {
      const result = await addToCart(chatId, arg1 ?? "");
      await answerCallbackQuery(callbackQueryId, result);
      return;
    }
    case "crt": {
      await answerCallbackQuery(callbackQueryId);
      await showCart(chatId);
      return;
    }
    case "prof": {
      await answerCallbackQuery(callbackQueryId);
      await showProfile(chatId, userId);
      return;
    }
    case "clr": {
      await saveSession(chatId, { state: "idle", cart: [], updatedAt: Date.now() });
      await answerCallbackQuery(callbackQueryId, "Savat tozalandi.");
      await showCart(chatId);
      return;
    }
    case "chk": {
      await answerCallbackQuery(callbackQueryId);
      await startCheckout(chatId, userId);
      return;
    }
    case "cfm_name": {
      await answerCallbackQuery(callbackQueryId);
      const session = await getSession(chatId);
      await finishOrder(chatId, userId, session.customerName ?? "Mijoz");
      return;
    }
    default:
      await answerCallbackQuery(callbackQueryId);
  }
}
