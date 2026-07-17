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
import { botDict, isBotLang, BOT_LANGS, BOT_LANG_LABELS, type BotLang, type BotDict } from "./bot-i18n";
import { logAction } from "./action-log";
import type { Product, ProductCategory } from "@/types/product";
import type { Order, OrderItem } from "@/types/order";

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
 * Til (uz/en/ru) ham shu hujjatda - /til yoki 🌐 tugmasi bilan tanlanadi.
 */

const PAGE_SIZE = 6;

type SessionState =
  | "idle"
  | "awaiting_checkout_name"
  | "awaiting_checkout_address"
  | "awaiting_payment"
  | "awaiting_search"
  | "awaiting_profile_name"
  | "awaiting_profile_address";

interface BotSession {
  state: SessionState;
  cart: OrderItem[];
  customerName?: string;
  deliveryAddress?: string | null;
  location?: { latitude: number; longitude: number } | null;
  lang?: BotLang;
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
  address?: string;
  registeredAt: number;
}

async function getBotUser(userId: number): Promise<BotUser | null> {
  const doc = await getAdminDb().collection("botUsers").doc(String(userId)).get();
  return doc.exists ? (doc.data() as BotUser) : null;
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

/**
 * KIRISH DARVOZASI: mijoz ro'yxatdan o'tganmi va majburiy kanallarga
 * obuna bo'lganmi. Bajarilmagan bo'lsa - tegishli so'rovni yuboradi va
 * `false` qaytaradi (chaqiruvchi to'xtaydi).
 */
async function ensureAccess(chatId: number, userId: number): Promise<boolean> {
  const user = await getBotUser(userId);
  if (!user) {
    await promptRegistration(chatId);
    return false;
  }

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
  await logAction(`🆕 Botda yangi mijoz: ${botUser.name}, ${botUser.phoneNumber}`);
  const session = await getSession(chatId);
  await removeReplyKeyboard(chatId, botDict(session.lang).registered);
  if (await ensureAccess(chatId, userId)) {
    await sendGreeting(chatId, botDict(session.lang));
  }
}

function mainMenuKeyboard(t: BotDict): { inline_keyboard: InlineButton[][] } {
  return {
    inline_keyboard: [
      [{ text: t.catalog, callback_data: "m|cat" }, { text: t.search, callback_data: "srch" }],
      [{ text: t.cart, callback_data: "crt" }, { text: t.myOrders, callback_data: "ords" }],
      [{ text: t.profile, callback_data: "prof" }, { text: t.language, callback_data: "lng" }],
    ],
  };
}

/** Salomlashuv: generatsiya qilingan banner rasm + asosiy menyu (/start). */
async function sendGreeting(chatId: number, t: BotDict): Promise<void> {
  await sendChatMessage(chatId, t.welcome, {
    replyMarkup: mainMenuKeyboard(t),
    photoUrl: WELCOME_IMAGE_URL,
  });
}

async function showMainMenu(chatId: number, t: BotDict): Promise<void> {
  await sendChatMessage(chatId, t.mainMenu, { replyMarkup: mainMenuKeyboard(t) });
}

async function showLanguageMenu(chatId: number, t: BotDict): Promise<void> {
  await sendChatMessage(chatId, t.chooseLanguage, {
    replyMarkup: {
      inline_keyboard: BOT_LANGS.map((l) => [{ text: BOT_LANG_LABELS[l], callback_data: `lng|${l}` }]),
    },
  });
}

/** Mijoz profili: generatsiya qilingan profil kartasi rasmi + tahrirlash tugmalari. */
async function showProfile(chatId: number, userId: number, t: BotDict): Promise<void> {
  const user = await getBotUser(userId);
  if (!user) {
    await promptRegistration(chatId);
    return;
  }
  const registered = new Date(user.registeredAt).toLocaleDateString("uz-UZ");
  const lines = [
    `👤 <b>${user.name}</b>`,
    `📞 ${user.phoneNumber}`,
    user.address ? `🏠 ${t.addressLabel}: ${user.address}` : "",
    `🗓 ${t.registeredAt}: ${registered}`,
    ``,
    `${t.profileSiteHint}: ${SITE_URL}/profil`,
  ].filter(Boolean);

  await sendChatMessage(chatId, lines.join("\n"), {
    photoUrl: profileImageUrl(user.name, user.phoneNumber),
    replyMarkup: {
      inline_keyboard: [
        [
          { text: t.editName, callback_data: "pe|name" },
          { text: t.editAddress, callback_data: "pe|addr" },
        ],
        [
          { text: t.catalog, callback_data: "m|cat" },
          { text: t.backToMenu, callback_data: "m|home" },
        ],
        [{ text: t.deleteAccount, callback_data: "delacc" }],
      ],
    },
  });
}

async function showCategories(chatId: number, t: BotDict): Promise<void> {
  const rows = (Object.keys(t.categories) as ProductCategory[]).map((value) => [
    { text: t.categories[value], callback_data: `c|${value}|0` },
  ]);
  rows.push([{ text: t.backToMenu, callback_data: "m|home" }]);
  await sendChatMessage(chatId, t.chooseCategory, { replyMarkup: { inline_keyboard: rows } });
}

async function showCategoryPage(
  chatId: number,
  category: ProductCategory,
  page: number,
  t: BotDict
): Promise<void> {
  const snapshot = await getAdminDb()
    .collection("products")
    .where("isActive", "==", true)
    .where("category", "==", category)
    .orderBy("createdAt", "desc")
    .offset(page * PAGE_SIZE)
    .limit(PAGE_SIZE + 1)
    .get();

  if (snapshot.empty && page === 0) {
    await sendChatMessage(chatId, t.emptyCategory, {
      replyMarkup: { inline_keyboard: [[{ text: t.backToCategories, callback_data: "m|cat" }]] },
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
  nav.push({ text: t.backToCategories, callback_data: "m|cat" });
  if (hasMore) nav.push({ text: "➡️", callback_data: `c|${category}|${page + 1}` });
  rows.push(nav);

  await sendChatMessage(chatId, `<b>${t.categories[category]}</b> — ${page + 1}-${t.page}:`, {
    replyMarkup: { inline_keyboard: rows },
  });
}

async function showProduct(chatId: number, productId: string, t: BotDict): Promise<void> {
  const doc = await getAdminDb().collection("products").doc(productId).get();
  if (!doc.exists) {
    await sendChatMessage(chatId, t.notFound);
    return;
  }
  const product = { id: doc.id, ...doc.data() } as Product;
  const price = product.discountPrice ?? product.price;

  const lines = [
    `<b>${product.name}</b>`,
    product.brand ? `${product.brand}${product.manufacturerCountry ? ` (${product.manufacturerCountry})` : ""}` : "",
    `💰 <b>${formatSom(price)}</b>${product.discountPrice ? ` <s>${formatSom(product.price)}</s>` : ""}`,
    product.stock > 0 ? `${t.inStock}: ${product.stock} ${t.unit}` : `❌ ${t.outOfStock}`,
    product.description ? `\n${product.description}` : "",
  ].filter(Boolean);

  const rows: InlineButton[][] = [];
  if (product.stock > 0) rows.push([{ text: t.addToCart, callback_data: `a|${product.id}` }]);
  rows.push([
    { text: t.back, callback_data: `c|${product.category}|0` },
    { text: t.cart, callback_data: "crt" },
  ]);

  await sendChatMessage(chatId, lines.join("\n"), {
    replyMarkup: { inline_keyboard: rows },
    photoUrl: product.thumbnailUrl || undefined,
  });
}

async function addToCart(chatId: number, productId: string, t: BotDict): Promise<string> {
  const doc = await getAdminDb().collection("products").doc(productId).get();
  if (!doc.exists) return t.notFound;
  const product = { id: doc.id, ...doc.data() } as Product;
  if (product.stock <= 0) return t.outOfStock;

  const session = await getSession(chatId);
  const existing = session.cart.find((i) => i.productId === productId);
  if (existing) {
    if (existing.quantity >= product.stock) return t.stockLimit;
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
  return `${t.added} (${session.cart.reduce((s, i) => s + i.quantity, 0)})`;
}

async function showCart(chatId: number, t: BotDict): Promise<void> {
  const session = await getSession(chatId);
  if (session.cart.length === 0) {
    await sendChatMessage(chatId, t.cartEmpty, {
      replyMarkup: { inline_keyboard: [[{ text: t.goCatalog, callback_data: "m|cat" }]] },
    });
    return;
  }

  const total = session.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const lines = session.cart.map((i) => `• ${i.name} — ${i.quantity} x ${formatSom(i.price)}`);
  lines.push(`\n<b>${t.total}: ${formatSom(total)}</b>`);

  await sendChatMessage(chatId, `${t.cartTitle}\n\n${lines.join("\n")}`, {
    replyMarkup: {
      inline_keyboard: [
        [{ text: t.checkout, callback_data: "chk" }],
        [
          { text: t.clearCart, callback_data: "clr" },
          { text: t.continueShopping, callback_data: "m|cat" },
        ],
      ],
    },
  });
}

// ---------------------------------------------------------------------------
// CHECKOUT: ism → manzil (matn yoki lokatsiya) → to'lov usuli → buyurtma
// ---------------------------------------------------------------------------

async function startCheckout(chatId: number, userId: number, t: BotDict): Promise<void> {
  const session = await getSession(chatId);
  if (session.cart.length === 0) {
    await showCart(chatId, t);
    return;
  }
  const botUser = await getBotUser(userId);
  session.state = "awaiting_checkout_name";
  session.customerName = botUser?.name;
  await saveSession(chatId, session);
  await sendChatMessage(
    chatId,
    `${t.confirmName}\n\n${t.current}: <b>${botUser?.name ?? "—"}</b>`,
    { replyMarkup: { inline_keyboard: [[{ text: `✅ ${botUser?.name ?? t.fullNameShort}`, callback_data: "cfm_name" }]] } }
  );
}

/** Ism qabul qilingach - manzil so'raymiz (matn / lokatsiya / o'tkazish). */
async function askAddress(chatId: number, session: BotSession, t: BotDict): Promise<void> {
  session.state = "awaiting_checkout_address";
  await saveSession(chatId, session);
  await sendChatMessageWithReplyKeyboard(chatId, t.askAddress, [
    [{ text: t.sendLocationBtn, request_location: true }],
    [{ text: t.skipBtn }],
  ]);
}

/** Manzil bosqichidan keyin to'lov usuli tanlanadi. */
async function askPayment(chatId: number, session: BotSession, t: BotDict): Promise<void> {
  session.state = "awaiting_payment";
  await saveSession(chatId, session);
  await removeReplyKeyboard(chatId, t.askPayment);
  await sendChatMessage(chatId, "👇", {
    replyMarkup: {
      inline_keyboard: [
        [{ text: t.payCash, callback_data: "pay|cash" }],
        [{ text: t.payOnline, callback_data: "pay|online" }],
      ],
    },
  });
}

async function finishOrder(
  chatId: number,
  userId: number,
  paymentMethod: "cash" | "online",
  t: BotDict
): Promise<void> {
  const session = await getSession(chatId);
  if (session.cart.length === 0) {
    await showCart(chatId, t);
    return;
  }
  const botUser = await getBotUser(userId);
  const order = await createOrder({
    customerName: session.customerName ?? botUser?.name ?? "Mijoz",
    phoneNumber: botUser?.phoneNumber ?? "",
    items: session.cart,
    location: session.location ?? null,
    deliveryAddress: session.deliveryAddress ?? botUser?.address ?? null,
    paymentMethod,
    customerChatId: chatId,
  });

  await saveSession(chatId, { state: "idle", cart: [], lang: session.lang, updatedAt: Date.now() });

  // Onlayn to'lov tanlanganda saytdagi to'lov sahifasiga tugma beramiz
  // (Payme/Click kalitlar ulangach o'sha yerda to'laydi).
  const keyboard =
    paymentMethod === "online"
      ? {
          inline_keyboard: [
            [{ text: t.payOnline, url: `${SITE_URL}/tolov/${order.id}` }],
            ...mainMenuKeyboard(t).inline_keyboard,
          ],
        }
      : mainMenuKeyboard(t);

  await sendChatMessage(
    chatId,
    [
      t.orderAccepted,
      `${t.orderNumber}: <b>#${order.id.slice(0, 8)}</b>`,
      `${t.orderTotal}: <b>${formatSom(order.totalAmount)}</b>`,
      ``,
      t.orderFollowUp,
    ].join("\n"),
    { replyMarkup: keyboard }
  );
}

// ---------------------------------------------------------------------------
// QIDIRUV va BUYURTMALAR TARIXI
// ---------------------------------------------------------------------------

async function runSearch(chatId: number, term: string, t: BotDict): Promise<void> {
  const q = term.trim().toLowerCase();
  const firstWord = q.split(/\s+/)[0] ?? q;

  // Prefiks + token qidiruvlari birga (saytdagi kabi). Token so'rovi
  // indeks bo'lmasa jim o'tkaziladi.
  const [prefixSnap, tokenSnap] = await Promise.all([
    getAdminDb()
      .collection("products")
      .orderBy("nameSearchIndex")
      .startAt(q)
      .endAt(q + "")
      .limit(8)
      .get(),
    getAdminDb()
      .collection("products")
      .where("isActive", "==", true)
      .where("nameTokens", "array-contains", firstWord)
      .limit(8)
      .get()
      .catch(() => null),
  ]);

  const seen = new Set<string>();
  const products: Product[] = [];
  for (const d of [...prefixSnap.docs, ...(tokenSnap?.docs ?? [])]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    const p = { id: d.id, ...d.data() } as Product;
    if (p.isActive) products.push(p);
  }

  if (products.length === 0) {
    await sendChatMessage(chatId, t.searchNoResults, {
      replyMarkup: { inline_keyboard: [[{ text: t.search, callback_data: "srch" }, { text: t.backToMenu, callback_data: "m|home" }]] },
    });
    return;
  }

  const rows: InlineButton[][] = products.map((p) => [
    { text: `${p.name} — ${formatSom(p.discountPrice ?? p.price)}`, callback_data: `p|${p.id}` },
  ]);
  rows.push([{ text: t.backToMenu, callback_data: "m|home" }]);
  await sendChatMessage(chatId, `🔍 "${term}":`, { replyMarkup: { inline_keyboard: rows } });
}

async function showMyOrders(chatId: number, t: BotDict): Promise<void> {
  let orders: Order[] = [];
  try {
    const snap = await getAdminDb()
      .collection("orders")
      .where("customerChatId", "==", chatId)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
  } catch {
    // Kompozit indeks hali yaratilmagan bo'lsa - saralashsiz olib,
    // xotirada tartiblaymiz.
    const snap = await getAdminDb().collection("orders").where("customerChatId", "==", chatId).limit(20).get();
    orders = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Order)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);
  }

  if (orders.length === 0) {
    await sendChatMessage(chatId, t.noOrders, {
      replyMarkup: { inline_keyboard: [[{ text: t.goCatalog, callback_data: "m|cat" }]] },
    });
    return;
  }

  const lines = orders.map((o) => {
    const date = new Date(o.createdAt).toLocaleDateString("uz-UZ");
    const items = o.items.map((i) => `  • ${i.name} × ${i.quantity}`).join("\n");
    return `#${o.id.slice(0, 8)} — ${date}\n${items}\n  ${t.total}: <b>${formatSom(o.totalAmount)}</b> | ${t.statusLabels[o.status]}`;
  });

  await sendChatMessage(chatId, `${t.ordersTitle}\n\n${lines.join("\n\n")}`, {
    replyMarkup: { inline_keyboard: [[{ text: t.backToMenu, callback_data: "m|home" }]] },
  });
}

// ---------------------------------------------------------------------------
// KIRISH NUQTALARI (webhook chaqiradi)
// ---------------------------------------------------------------------------

/** Shaxsiy chatdagi matnli/kontaktli/lokatsiyali xabarlar. */
export async function handleCustomerMessage(params: {
  chatId: number;
  userId: number;
  text?: string;
  contact?: { phone_number: string; first_name?: string; last_name?: string };
  location?: { latitude: number; longitude: number };
}): Promise<void> {
  const { chatId, userId, text, contact, location } = params;

  // Telefon kontakti kelsa - ro'yxatdan o'tkazamiz.
  if (contact?.phone_number) {
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() || "Mijoz";
    await registerWithContact({ chatId, userId, phoneNumber: contact.phone_number, name });
    return;
  }

  // Kirish darvozasi (ro'yxat + kanallar) - o'tmaguncha oldinga o'tmaydi.
  if (!(await ensureAccess(chatId, userId))) return;

  const session = await getSession(chatId);
  const t = botDict(session.lang);

  // ---- Checkout: manzil bosqichida lokatsiya kelishi mumkin ----
  if (session.state === "awaiting_checkout_address" && location) {
    session.location = location;
    session.deliveryAddress = null;
    await askPayment(chatId, session, t);
    return;
  }

  if (text) {
    const command = text.trim().toLowerCase();

    // Holat mashinasidagi matn bosqichlari
    if (session.state === "awaiting_checkout_name" && !command.startsWith("/")) {
      const name = text.trim();
      if (name.length < 2) {
        await sendChatMessage(chatId, t.confirmName);
        return;
      }
      session.customerName = name;
      await askAddress(chatId, session, t);
      return;
    }

    if (session.state === "awaiting_checkout_address" && !command.startsWith("/")) {
      // "O'tkazish" tugmasi ham oddiy matn sifatida keladi.
      if (text.trim() === t.skipBtn) {
        session.deliveryAddress = null;
      } else {
        session.deliveryAddress = text.trim();
        session.location = null;
      }
      await askPayment(chatId, session, t);
      return;
    }

    if (session.state === "awaiting_search" && !command.startsWith("/")) {
      session.state = "idle";
      await saveSession(chatId, session);
      await runSearch(chatId, text, t);
      return;
    }

    if (session.state === "awaiting_profile_name" && !command.startsWith("/")) {
      const name = text.trim();
      if (name.length >= 2) {
        await getAdminDb().collection("botUsers").doc(String(userId)).update({ name });
      }
      session.state = "idle";
      await saveSession(chatId, session);
      await sendChatMessage(chatId, t.savedOk);
      await showProfile(chatId, userId, t);
      return;
    }

    if (session.state === "awaiting_profile_address" && !command.startsWith("/")) {
      await getAdminDb().collection("botUsers").doc(String(userId)).update({ address: text.trim() });
      session.state = "idle";
      await saveSession(chatId, session);
      await sendChatMessage(chatId, t.savedOk);
      await showProfile(chatId, userId, t);
      return;
    }

    // Buyruqlar
    if (command === "/profil" || command === "/profile") {
      await showProfile(chatId, userId, t);
      return;
    }
    if (command === "/buyurtmalarim" || command === "/orders") {
      await showMyOrders(chatId, t);
      return;
    }
    if (command === "/til" || command === "/lang") {
      await showLanguageMenu(chatId, t);
      return;
    }
    if (command === "/start") {
      await sendGreeting(chatId, t);
      return;
    }
  }

  await showMainMenu(chatId, t);
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

  // Til tanlash - ro'yxatdan o'tishdan oldin ham ishlashi kerak.
  if (action === "lng") {
    await answerCallbackQuery(callbackQueryId);
    const session = await getSession(chatId);
    if (arg1 && isBotLang(arg1)) {
      session.lang = arg1;
      await saveSession(chatId, session);
      const t = botDict(arg1);
      await sendChatMessage(chatId, t.languageSet, { replyMarkup: mainMenuKeyboard(t) });
    } else {
      await showLanguageMenu(chatId, botDict(session.lang));
    }
    return;
  }

  // "Tekshirish" tugmasi - obuna qayta tekshiriladi.
  if (action === "chk_sub") {
    await answerCallbackQuery(callbackQueryId);
    if (await ensureAccess(chatId, userId)) {
      const session = await getSession(chatId);
      await showMainMenu(chatId, botDict(session.lang));
    }
    return;
  }

  // Boshqa barcha amallar uchun kirish darvozasidan o'tish shart.
  if (!(await ensureAccess(chatId, userId))) {
    await answerCallbackQuery(callbackQueryId);
    return;
  }

  const session = await getSession(chatId);
  const t = botDict(session.lang);

  switch (action) {
    case "m": {
      await answerCallbackQuery(callbackQueryId);
      if (arg1 === "cat") await showCategories(chatId, t);
      else await showMainMenu(chatId, t);
      return;
    }
    case "c": {
      await answerCallbackQuery(callbackQueryId);
      await showCategoryPage(chatId, arg1 as ProductCategory, Number(arg2 ?? 0), t);
      return;
    }
    case "p": {
      await answerCallbackQuery(callbackQueryId);
      await showProduct(chatId, arg1 ?? "", t);
      return;
    }
    case "a": {
      const result = await addToCart(chatId, arg1 ?? "", t);
      await answerCallbackQuery(callbackQueryId, result);
      return;
    }
    case "crt": {
      await answerCallbackQuery(callbackQueryId);
      await showCart(chatId, t);
      return;
    }
    case "clr": {
      await saveSession(chatId, { state: "idle", cart: [], lang: session.lang, updatedAt: Date.now() });
      await answerCallbackQuery(callbackQueryId, t.cartCleared);
      await showCart(chatId, t);
      return;
    }
    case "chk": {
      await answerCallbackQuery(callbackQueryId);
      await startCheckout(chatId, userId, t);
      return;
    }
    case "cfm_name": {
      await answerCallbackQuery(callbackQueryId);
      await askAddress(chatId, session, t);
      return;
    }
    case "pay": {
      await answerCallbackQuery(callbackQueryId);
      if (session.state === "awaiting_payment") {
        await finishOrder(chatId, userId, arg1 === "online" ? "online" : "cash", t);
      }
      return;
    }
    case "srch": {
      await answerCallbackQuery(callbackQueryId);
      session.state = "awaiting_search";
      await saveSession(chatId, session);
      await sendChatMessage(chatId, t.searchPrompt);
      return;
    }
    case "ords": {
      await answerCallbackQuery(callbackQueryId);
      await showMyOrders(chatId, t);
      return;
    }
    case "prof": {
      await answerCallbackQuery(callbackQueryId);
      await showProfile(chatId, userId, t);
      return;
    }
    case "pe": {
      await answerCallbackQuery(callbackQueryId);
      session.state = arg1 === "name" ? "awaiting_profile_name" : "awaiting_profile_address";
      await saveSession(chatId, session);
      await sendChatMessage(chatId, arg1 === "name" ? t.askNewName : t.askNewAddress);
      return;
    }
    case "delacc": {
      await answerCallbackQuery(callbackQueryId);
      if (arg1 === "yes") {
        // Hisobni butunlay o'chirish: ro'yxat yozuvi + sessiya (savat, til).
        const deletedUser = await getBotUser(userId);
        await getAdminDb().collection("botUsers").doc(String(userId)).delete().catch(() => {});
        await getAdminDb().collection("botSessions").doc(String(chatId)).delete().catch(() => {});
        // Buyurtmalar biznes-yozuv sifatida qoladi, lekin egasidan uziladi -
        // aks holda qayta ro'yxatdan o'tganda eski tarix qaytib ko'rinardi.
        try {
          const ordersSnap = await getAdminDb()
            .collection("orders")
            .where("customerChatId", "==", chatId)
            .limit(300)
            .get();
          if (!ordersSnap.empty) {
            const batch = getAdminDb().batch();
            ordersSnap.docs.forEach((d) => batch.update(d.ref, { customerChatId: null }));
            await batch.commit();
          }
        } catch (error) {
          console.error("Buyurtmalarni uzishda xato:", error);
        }
        await sendChatMessage(chatId, t.deleteDone);
        await logAction(`🗑 Bot hisobi o'chirildi: ${deletedUser?.name ?? userId}${deletedUser?.phoneNumber ? `, ${deletedUser.phoneNumber}` : ""}`);
        return;
      }
      if (arg1 === "no") {
        await showProfile(chatId, userId, t);
        return;
      }
      // Tasdiqlash bosqichi
      await sendChatMessage(chatId, t.deleteConfirm, {
        replyMarkup: {
          inline_keyboard: [
            [{ text: t.deleteYes, callback_data: "delacc|yes" }],
            [{ text: t.deleteNo, callback_data: "delacc|no" }],
          ],
        },
      });
      return;
    }
    default:
      await answerCallbackQuery(callbackQueryId);
  }
}
