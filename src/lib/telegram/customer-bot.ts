import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  sendChatMessage,
  answerCallbackQuery,
  sendChatMessageWithReplyKeyboard,
  removeReplyKeyboard,
  isChatMember,
  sendMediaGroup,
  type MediaItem,
} from "./bot";
import { getRequiredChannels } from "./required-channels";
import { createOrder, OrderValidationError } from "@/lib/orders/create-order";
import { getDeliverySettings, getPromoCode } from "@/lib/orders/pricing";
import { deliveryFeeFor, validatePromo, normalizePromoCode } from "@/lib/orders/promo";
import { botDict, isBotLang, BOT_LANGS, BOT_LANG_LABELS, type BotLang, type BotDict } from "./bot-i18n";
import { logAction } from "./action-log";
import { attachLoginCode } from "./telegram-auth";
import { applyOrderStatusUpdate } from "@/lib/orders/update-status";
import { getFacets } from "@/lib/products/facets";
import { BUILTIN_UNITS, DEFAULT_UNIT, labelOf } from "@/lib/products/taxonomy";
import { getPublishedPosts, getSiteSettings } from "@/lib/firebase/admin-content";
import { listReviews, saveReview } from "@/lib/reviews/save-review";
import type { Product, ProductCategory } from "@/types/product";
import type { Order, OrderItem } from "@/types/order";
import type { BlogPost } from "@/types/content";

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
  | "awaiting_profile_address"
  | "awaiting_promo"
  | "awaiting_review_text";

/** Katalog filtri (saytdagi FilterPanel bilan bir xil mantiq). */
interface BotFilters {
  brand?: string;
  material?: string;
  sort?: "newest" | "price-asc" | "price-desc";
}

interface BotSession {
  state: SessionState;
  cart: OrderItem[];
  customerName?: string;
  deliveryAddress?: string | null;
  location?: { latitude: number; longitude: number } | null;
  lang?: BotLang;
  /** Sevimli mahsulotlar (ID ro'yxati) - saytdagi wishlist bilan bir xil g'oya. */
  favorites?: string[];
  filters?: BotFilters;
  /** Checkout'da qo'llangan promokod (server baribir qayta tekshiradi). */
  promoCode?: string | null;
  /** Sharh yozish oqimi: qaysi mahsulotga va nechta yulduz. */
  reviewProductId?: string;
  reviewRating?: number;
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

/** Firestore `undefined` qiymatlarni qabul qilmaydi - ularni olib tashlaymiz. */
function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

async function saveSession(chatId: number, session: BotSession): Promise<void> {
  await getAdminDb()
    .collection("botSessions")
    .doc(String(chatId))
    .set(stripUndefined({ ...session, updatedAt: Date.now() }));
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
      [{ text: t.cart, callback_data: "crt" }, { text: t.favorites, callback_data: "fav" }],
      [{ text: t.myOrders, callback_data: "ords" }, { text: t.profile, callback_data: "prof" }],
      [{ text: t.blog, callback_data: "blog|0" }, { text: t.contact, callback_data: "info" }],
      [{ text: t.language, callback_data: "lng" }],
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
    { text: t.categories[value] ?? value, callback_data: `c|${value}|0` },
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
  const session = await getSession(chatId);
  const filters = session.filters ?? {};

  // Saytdagi filtr bilan bir xil: brend/material tanlansa - shu bo'yicha,
  // saralash esa createdAt yoki price. Har bir variant uchun kompozit
  // indeks bor (firestore.indexes.json), indeks yo'q bo'lsa - saralashsiz
  // olib, xotirada tartiblaymiz.
  let query: FirebaseFirestore.Query = getAdminDb()
    .collection("products")
    .where("isActive", "==", true)
    .where("category", "==", category);

  if (filters.brand) query = query.where("brand", "==", filters.brand);
  if (filters.material) query = query.where("material", "==", filters.material);

  const sort = filters.sort ?? "newest";
  let products: Product[] = [];
  let hasMore = false;

  const applySort = (q: FirebaseFirestore.Query) =>
    sort === "price-asc"
      ? q.orderBy("price", "asc")
      : sort === "price-desc"
        ? q.orderBy("price", "desc")
        : q.orderBy("createdAt", "desc");

  try {
    const snapshot = await applySort(query).offset(page * PAGE_SIZE).limit(PAGE_SIZE + 1).get();
    hasMore = snapshot.docs.length > PAGE_SIZE;
    products = snapshot.docs.slice(0, PAGE_SIZE).map((d) => ({ id: d.id, ...d.data() }) as Product);
  } catch {
    const snapshot = await query.limit(120).get();
    const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
    all.sort((a, b) =>
      sort === "price-asc"
        ? a.price - b.price
        : sort === "price-desc"
          ? b.price - a.price
          : b.createdAt - a.createdAt
    );
    products = all.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    hasMore = all.length > (page + 1) * PAGE_SIZE;
  }

  if (products.length === 0 && page === 0) {
    await sendChatMessage(chatId, t.emptyCategory, {
      replyMarkup: {
        inline_keyboard: [
          [{ text: t.filterClear, callback_data: `flt|clear|${category}` }],
          [{ text: t.backToCategories, callback_data: "m|cat" }],
        ],
      },
    });
    return;
  }

  const rows: InlineButton[][] = products.map((p) => [
    { text: `${p.name} — ${formatSom(effectiveBotPrice(p))}`, callback_data: `p|${p.id}` },
  ]);

  const nav: InlineButton[] = [];
  if (page > 0) nav.push({ text: "⬅️", callback_data: `c|${category}|${page - 1}` });
  nav.push({ text: t.backToCategories, callback_data: "m|cat" });
  if (hasMore) nav.push({ text: "➡️", callback_data: `c|${category}|${page + 1}` });
  rows.push(nav);
  rows.push([{ text: t.filter, callback_data: `flt|menu|${category}` }]);

  const activeFilter = [filters.brand, filters.material].filter(Boolean).join(" · ");
  const header = `<b>${t.categories[category] ?? category}</b> — ${page + 1}-${t.page}${activeFilter ? `\n⚙️ ${activeFilter}` : ""}`;

  await sendChatMessage(chatId, `${header}:`, { replyMarkup: { inline_keyboard: rows } });
}

/** Chegirma muddati tekshirilgan haqiqiy narx (sayt bilan bir xil qoida). */
function effectiveBotPrice(product: Product): number {
  const active =
    !!product.discountPrice &&
    product.discountPrice < product.price &&
    (!product.discountUntil || product.discountUntil > Date.now());
  return active ? product.discountPrice! : product.price;
}

async function showProduct(chatId: number, productId: string, t: BotDict): Promise<void> {
  const doc = await getAdminDb().collection("products").doc(productId).get();
  if (!doc.exists) {
    await sendChatMessage(chatId, t.notFound);
    return;
  }
  const product = { id: doc.id, ...doc.data() } as Product;
  const price = effectiveBotPrice(product);
  const session = await getSession(chatId);
  const isFavorite = (session.favorites ?? []).includes(product.id);

  const unit = labelOf(BUILTIN_UNITS, product.unit) || product.unit || DEFAULT_UNIT;
  const lines = [
    `<b>${product.name}</b>`,
    product.brand ? `${product.brand}${product.manufacturerCountry ? ` (${product.manufacturerCountry})` : ""}` : "",
    `💰 <b>${formatSom(price)}</b> / ${unit}${price < product.price ? ` <s>${formatSom(product.price)}</s>` : ""}`,
    (product.ratingCount ?? 0) > 0
      ? `⭐️ ${product.ratingAvg?.toFixed(1)} (${product.ratingCount})`
      : "",
    product.stock > 0 ? `${t.inStock}: ${product.stock} ${unit}` : `❌ ${t.outOfStock}`,
    product.description ? `\n${product.description}` : "",
  ].filter(Boolean);

  const rows: InlineButton[][] = [];
  if (product.stock > 0) rows.push([{ text: t.addToCart, callback_data: `a|${product.id}` }]);
  rows.push([
    { text: isFavorite ? t.favRemove : t.favAdd, callback_data: `fv|${product.id}` },
    { text: t.reviewsBtn, callback_data: `rv|${product.id}` },
  ]);
  rows.push([
    { text: t.back, callback_data: `c|${product.category}|0` },
    { text: t.cart, callback_data: "crt" },
  ]);

  // Mahsulotda bir nechta rasm bo'lsa - avval albom, keyin tugmali
  // kartochka (albomga inline tugma biriktirib bo'lmaydi). Albom
  // yuborilmasa ham kartochka baribir chiqadi.
  // Rasm va videolar - bitta albom. Albomga tugma biriktirib
  // bo'lmagani uchun tugmali kartochka keyin yuboriladi.
  const gallery: MediaItem[] = [
    ...(product.images ?? []).filter(Boolean).map((url) => ({ url, type: "photo" as const })),
    ...(product.videos ?? []).filter(Boolean).map((url) => ({ url, type: "video" as const })),
  ].slice(0, 10);

  let sentGallery = false;
  if (gallery.length > 1) {
    try {
      await sendMediaGroup(chatId, gallery);
      sentGallery = true;
    } catch (error) {
      console.error("Mahsulot albomini yuborishda xato:", error);
    }
  }

  await sendChatMessage(chatId, lines.join("\n"), {
    replyMarkup: { inline_keyboard: rows },
    // Albom yuborilgan bo'lsa birinchi rasm takrorlanmaydi.
    photoUrl: sentGallery ? undefined : gallery[0]?.url || product.thumbnailUrl || undefined,
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
      price: effectiveBotPrice(product),
      quantity: 1,
      thumbnailUrl: product.thumbnailUrl,
    });
  }
  await saveSession(chatId, session);
  return `${t.added} (${session.cart.reduce((s, i) => s + i.quantity, 0)})`;
}

/**
 * SAVAT: har bir mahsulot uchun ➖ / soni / ➕ / 🗑 tugmalari, promokod
 * qatori va to'liq hisob (mahsulotlar - chegirma + yetkazish).
 * Hisob faqat ko'rsatish uchun; yakuniy summa buyurtma yaratishda
 * serverda qayta chiqariladi.
 */
async function showCart(chatId: number, t: BotDict): Promise<void> {
  const session = await getSession(chatId);
  if (session.cart.length === 0) {
    await sendChatMessage(chatId, t.cartEmpty, {
      replyMarkup: { inline_keyboard: [[{ text: t.goCatalog, callback_data: "m|cat" }]] },
    });
    return;
  }

  const subtotal = session.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Promokod va yetkazib berish - saytdagi bilan bir xil qoidalar.
  let discount = 0;
  if (session.promoCode) {
    const promo = await getPromoCode(session.promoCode);
    const result = validatePromo(promo, subtotal);
    if (result.ok) discount = result.discount;
    else session.promoCode = null;
  }
  const delivery = deliveryFeeFor(await getDeliverySettings(), subtotal - discount);
  const total = subtotal - discount + delivery;

  const lines = session.cart.map((i) => `• ${i.name} — ${i.quantity} × ${formatSom(i.price)}`);
  lines.push("", `${t.subtotalLabel}: ${formatSom(subtotal)}`);
  if (discount > 0) lines.push(`${t.discountLabel} (${session.promoCode}): −${formatSom(discount)}`);
  if (delivery > 0) lines.push(`${t.deliveryLabel}: ${formatSom(delivery)}`);
  lines.push(`<b>${t.total}: ${formatSom(total)}</b>`);

  // Har bir qator uchun boshqaruv tugmalari.
  const rows: InlineButton[][] = session.cart.map((item) => [
    { text: t.qtyMinus, callback_data: `q|-|${item.productId}` },
    { text: `${item.quantity} × ${item.name.slice(0, 18)}`, callback_data: `p|${item.productId}` },
    { text: t.qtyPlus, callback_data: `q|+|${item.productId}` },
    { text: t.removeItem, callback_data: `q|x|${item.productId}` },
  ]);

  rows.push([
    session.promoCode
      ? { text: t.promoRemoveBtn, callback_data: "promo|clear" }
      : { text: t.promoBtn, callback_data: "promo|ask" },
  ]);
  rows.push([{ text: t.checkout, callback_data: "chk" }]);
  rows.push([
    { text: t.clearCart, callback_data: "clr" },
    { text: t.continueShopping, callback_data: "m|cat" },
  ]);

  await saveSession(chatId, session);
  await sendChatMessage(chatId, `${t.cartTitle}\n\n${lines.join("\n")}`, {
    replyMarkup: { inline_keyboard: rows },
  });
}

/** Savatdagi mahsulot sonini o'zgartirish (+ / − / o'chirish). */
async function changeCartItem(
  chatId: number,
  op: "+" | "-" | "x",
  productId: string,
  t: BotDict
): Promise<string> {
  const session = await getSession(chatId);
  const index = session.cart.findIndex((i) => i.productId === productId);
  if (index < 0) return t.notFound;

  if (op === "x") {
    session.cart.splice(index, 1);
    await saveSession(chatId, session);
    return t.itemRemoved;
  }

  const item = session.cart[index]!;
  if (op === "+") {
    const doc = await getAdminDb().collection("products").doc(productId).get();
    const stock = (doc.data()?.stock as number | undefined) ?? 0;
    if (item.quantity >= stock) return t.stockLimit;
    item.quantity += 1;
  } else {
    item.quantity -= 1;
    if (item.quantity <= 0) session.cart.splice(index, 1);
  }
  await saveSession(chatId, session);
  return "✅";
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
  let order;
  try {
    order = await createOrder({
      customerName: session.customerName ?? botUser?.name ?? "Mijoz",
      phoneNumber: botUser?.phoneNumber ?? "",
      items: session.cart,
      location: session.location ?? null,
      deliveryAddress: session.deliveryAddress ?? botUser?.address ?? null,
      paymentMethod,
      promoCode: session.promoCode ?? null,
      customerChatId: chatId,
    });
  } catch (error) {
    // Zaxira yetmasa yoki mahsulot sotuvdan olingan bo'lsa - savat saqlanadi,
    // mijozga aniq sabab aytiladi.
    if (error instanceof OrderValidationError) {
      session.state = "idle";
      await saveSession(chatId, session);
      await sendChatMessage(chatId, `⚠️ ${error.message}`, { replyMarkup: mainMenuKeyboard(t) });
      return;
    }
    throw error;
  }

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
      order.discountAmount ? `${t.discountLabel}: −${formatSom(order.discountAmount)}` : "",
      order.deliveryFee ? `${t.deliveryLabel}: ${formatSom(order.deliveryFee)}` : "",
      `${t.orderTotal}: <b>${formatSom(order.totalAmount)}</b>`,
      ``,
      t.orderFollowUp,
    ]
      .filter(Boolean)
      .join("\n"),
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

  // Hali yo'lga chiqmagan buyurtmalarni mijozning o'zi bekor qila oladi
  // (saytdagi bilan bir xil shart: pending yoki approved).
  const rows: InlineButton[][] = orders
    .filter((o) => o.status === "pending" || o.status === "approved")
    .map((o) => [
      { text: `${t.cancelOrder} #${o.id.slice(0, 8)}`, callback_data: `oc|ask|${o.id}` },
    ]);
  rows.push([{ text: t.backToMenu, callback_data: "m|home" }]);

  await sendChatMessage(chatId, `${t.ordersTitle}\n\n${lines.join("\n\n")}`, {
    replyMarkup: { inline_keyboard: rows },
  });
}

// ---------------------------------------------------------------------------
// SEVIMLILAR, FILTR, SHARHLAR, BLOG, KONTAKT, BUYURTMANI BEKOR QILISH
// (saytdagi imkoniyatlarning Telegramdagi ko'rinishi)
// ---------------------------------------------------------------------------

/** Sevimlilarga qo'shish / olib tashlash (sessiyada saqlanadi). */
async function toggleFavorite(chatId: number, productId: string, t: BotDict): Promise<string> {
  const session = await getSession(chatId);
  const favorites = session.favorites ?? [];
  const index = favorites.indexOf(productId);

  if (index >= 0) favorites.splice(index, 1);
  else favorites.push(productId);

  session.favorites = favorites;
  await saveSession(chatId, session);
  return index >= 0 ? t.favRemoved : t.favAdded;
}

async function showFavorites(chatId: number, t: BotDict): Promise<void> {
  const session = await getSession(chatId);
  const ids = (session.favorites ?? []).slice(0, 30);

  if (ids.length === 0) {
    await sendChatMessage(chatId, t.favEmpty, {
      replyMarkup: { inline_keyboard: [[{ text: t.goCatalog, callback_data: "m|cat" }]] },
    });
    return;
  }

  const snaps = await getAdminDb().getAll(
    ...ids.map((id) => getAdminDb().collection("products").doc(id))
  );
  const products = snaps
    .filter((s) => s.exists)
    .map((s) => ({ id: s.id, ...s.data() }) as Product);

  const rows: InlineButton[][] = products.map((product) => [
    { text: `${product.name} — ${formatSom(effectiveBotPrice(product))}`, callback_data: `p|${product.id}` },
    { text: t.removeItem, callback_data: `fv|${product.id}` },
  ]);
  rows.push([{ text: t.backToMenu, callback_data: "m|home" }]);

  await sendChatMessage(chatId, t.favTitle, { replyMarkup: { inline_keyboard: rows } });
}

/** Filtr menyusi: brend, material, saralash, tozalash. */
async function showFilterMenu(chatId: number, category: ProductCategory, t: BotDict): Promise<void> {
  const session = await getSession(chatId);
  const filters = session.filters ?? {};
  const facets = await getFacets();

  const rows: InlineButton[][] = [];

  // Brendlar - ikkitadan qatorga.
  const brands = facets.brands.slice(0, 12);
  for (let i = 0; i < brands.length; i += 2) {
    rows.push(
      brands.slice(i, i + 2).map((brand) => ({
        text: `${filters.brand === brand ? "✅ " : ""}${brand}`,
        callback_data: `flt|brand|${category}|${brand}`,
      }))
    );
  }

  const materials: { value: string; label: string }[] = [
    { value: "polypropylene", label: "Polipropilen" },
    { value: "metal-plastic", label: "Metalplastik" },
    { value: "steel", label: "Po'lat" },
    { value: "copper", label: "Mis" },
    { value: "brass", label: "Latun" },
    { value: "cast-iron", label: "Cho'yan" },
    { value: "pvc", label: "PVX" },
  ];
  for (let i = 0; i < materials.length; i += 2) {
    rows.push(
      materials.slice(i, i + 2).map((m) => ({
        text: `${filters.material === m.value ? "✅ " : ""}${m.label}`,
        callback_data: `flt|mat|${category}|${m.value}`,
      }))
    );
  }

  rows.push([
    { text: `${(filters.sort ?? "newest") === "newest" ? "✅ " : ""}${t.sortNewest}`, callback_data: `flt|sort|${category}|newest` },
    { text: `${filters.sort === "price-asc" ? "✅ " : ""}${t.sortPriceAsc}`, callback_data: `flt|sort|${category}|price-asc` },
    { text: `${filters.sort === "price-desc" ? "✅ " : ""}${t.sortPriceDesc}`, callback_data: `flt|sort|${category}|price-desc` },
  ]);
  rows.push([
    { text: t.filterClear, callback_data: `flt|clear|${category}` },
    { text: t.back, callback_data: `c|${category}|0` },
  ]);

  await sendChatMessage(chatId, `${t.filterTitle}\n${t.categories[category] ?? category}`, {
    replyMarkup: { inline_keyboard: rows },
  });
}

/** Filtr tugmasi bosilganda qiymatni almashtirib, ro'yxatni qayta ochadi. */
async function applyFilter(
  chatId: number,
  kind: string,
  category: ProductCategory,
  value: string | undefined,
  t: BotDict
): Promise<void> {
  const session = await getSession(chatId);
  const filters: BotFilters = session.filters ?? {};

  if (kind === "clear") {
    session.filters = {};
  } else if (kind === "brand") {
    filters.brand = filters.brand === value ? undefined : value;
    session.filters = filters;
  } else if (kind === "mat") {
    filters.material = filters.material === value ? undefined : value;
    session.filters = filters;
  } else if (kind === "sort") {
    filters.sort = (value as BotFilters["sort"]) ?? "newest";
    session.filters = filters;
  }

  // undefined maydonlar Firestore'ga yozilmaydi.
  if (session.filters) session.filters = stripUndefined({ ...session.filters }) as BotFilters;
  await saveSession(chatId, session);
  await showCategoryPage(chatId, category, 0, t);
}

/** Mahsulot sharhlari + "sharh yozish" tugmasi. */
async function showReviews(chatId: number, productId: string, t: BotDict): Promise<void> {
  const reviews = await listReviews(productId, 10);
  const body =
    reviews.length === 0
      ? t.noReviews
      : reviews
          .map((r) => `${"⭐️".repeat(r.rating)}\n<b>${r.authorName}</b>: ${r.comment}`)
          .join("\n\n");

  await sendChatMessage(chatId, `${t.reviewsTitle}\n\n${body}`, {
    replyMarkup: {
      inline_keyboard: [
        [{ text: t.writeReview, callback_data: `rw|${productId}` }],
        [{ text: t.back, callback_data: `p|${productId}` }],
      ],
    },
  });
}

/** Sharh yozish: avval yulduz, keyin matn. */
async function askReviewRating(chatId: number, productId: string, t: BotDict): Promise<void> {
  await sendChatMessage(chatId, t.ratePrompt, {
    replyMarkup: {
      inline_keyboard: [
        [1, 2, 3, 4, 5].map((n) => ({ text: "⭐️".repeat(n), callback_data: `rs|${productId}|${n}` })),
      ],
    },
  });
}

/** Blog ro'yxati (sahifalab). */
async function showBlogList(chatId: number, page: number, t: BotDict): Promise<void> {
  const posts = await getPublishedPosts(30);
  if (posts.length === 0) {
    await sendChatMessage(chatId, t.blogEmpty, {
      replyMarkup: { inline_keyboard: [[{ text: t.backToMenu, callback_data: "m|home" }]] },
    });
    return;
  }

  const pageItems = posts.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const rows: InlineButton[][] = pageItems.map((post) => [
    { text: post.title, callback_data: `bp|${post.id}` },
  ]);

  const nav: InlineButton[] = [];
  if (page > 0) nav.push({ text: "⬅️", callback_data: `blog|${page - 1}` });
  nav.push({ text: t.backToMenu, callback_data: "m|home" });
  if (posts.length > (page + 1) * PAGE_SIZE) nav.push({ text: "➡️", callback_data: `blog|${page + 1}` });
  rows.push(nav);

  await sendChatMessage(chatId, `<b>${t.blog}</b>`, { replyMarkup: { inline_keyboard: rows } });
}

/** Bitta maqola: qisqartirilgan matn + saytda to'liq o'qish tugmasi. */
async function showBlogPost(chatId: number, postId: string, t: BotDict): Promise<void> {
  const doc = await getAdminDb().collection("blogPosts").doc(postId).get();
  if (!doc.exists) {
    await sendChatMessage(chatId, t.blogEmpty);
    return;
  }
  const post = { id: doc.id, ...doc.data() } as BlogPost;

  // Telegram xabari 4096 belgidan oshmasin; rasm belgilari olib tashlanadi.
  const clean = post.content.replace(/\[rasm:[^\]]+\]/g, "").trim();
  const body = clean.length > 2500 ? `${clean.slice(0, 2500)}…` : clean;

  await sendChatMessage(chatId, `<b>${post.title}</b>\n\n${body}`, {
    photoUrl: post.coverImageUrl || undefined,
    replyMarkup: {
      inline_keyboard: [
        [{ text: t.readOnSite, url: `${SITE_URL}/blog/${post.slug}` }],
        [{ text: t.blog, callback_data: "blog|0" }, { text: t.backToMenu, callback_data: "m|home" }],
      ],
    },
  });
}

/** Kontakt + "Biz haqimizda" (admin panelda tahrirlanadigan matn). */
async function showContactInfo(chatId: number, t: BotDict): Promise<void> {
  const settings = await getSiteSettings();
  const about = settings.about.body.slice(0, 900);

  const lines = [
    t.contactTitle,
    ``,
    `📞 ${settings.phone}`,
    `✉️ ${settings.email}`,
    `📍 ${settings.address}`,
    ``,
    `<b>${t.about}</b>`,
    about,
  ];

  const socialRow: InlineButton[] = settings.socials
    .filter((s) => s.url)
    .slice(0, 3)
    .map((s) => ({ text: s.platform, url: s.url }));

  const rows: InlineButton[][] = [];
  if (socialRow.length > 0) rows.push(socialRow);
  rows.push([{ text: t.backToMenu, callback_data: "m|home" }]);

  await sendChatMessage(chatId, lines.join("\n"), { replyMarkup: { inline_keyboard: rows } });
}

/** Mijoz o'z buyurtmasini bekor qiladi (faqat pending/approved). */
async function cancelOwnOrder(chatId: number, orderId: string, t: BotDict): Promise<string> {
  const doc = await getAdminDb().collection("orders").doc(orderId).get();
  if (!doc.exists) return t.notFound;

  const order = { id: doc.id, ...doc.data() } as Order;
  // Faqat o'z buyurtmasi va faqat hali yo'lga chiqmagani bekor qilinadi.
  if (order.customerChatId !== chatId) return t.cancelNotAllowed;
  if (order.status !== "pending" && order.status !== "approved") return t.cancelNotAllowed;

  await applyOrderStatusUpdate(orderId, "cancelled");
  await logAction(`❌ Mijoz botdan buyurtmani bekor qildi: #${orderId.slice(0, 8)}`);
  return t.cancelDone;
}

// ---------------------------------------------------------------------------
// KIRISH NUQTALARI (webhook chaqiradi)
// ---------------------------------------------------------------------------

/** Shaxsiy chatdagi matnli/kontaktli/lokatsiyali xabarlar. */
export async function handleCustomerMessage(params: {
  chatId: number;
  userId: number;
  text?: string;
  /** Telegram profilidan (saytga kirishda ism/rasm uchun ishlatiladi). */
  firstName?: string;
  lastName?: string;
  username?: string;
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

    // Promokod kiritish (savatdan "🏷 Promokod" tugmasi bilan boshlanadi).
    if (session.state === "awaiting_promo" && !command.startsWith("/")) {
      const code = normalizePromoCode(text);
      const subtotal = session.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const result = validatePromo(await getPromoCode(code), subtotal);

      session.state = "idle";
      session.promoCode = result.ok ? code : null;
      await saveSession(chatId, session);
      await sendChatMessage(chatId, result.ok ? `${t.promoApplied}: ${code}` : t.promoInvalid);
      await showCart(chatId, t);
      return;
    }

    // Sharh matni (yulduz allaqachon tanlangan).
    if (session.state === "awaiting_review_text" && !command.startsWith("/")) {
      const productId = session.reviewProductId;
      const rating = session.reviewRating ?? 5;
      session.state = "idle";
      session.reviewProductId = undefined;
      session.reviewRating = undefined;
      await saveSession(chatId, session);

      if (productId && text.trim().length >= 3) {
        const botUser = await getBotUser(userId);
        try {
          await saveReview({
            productId,
            userKey: `tg:${userId}`,
            authorName: botUser?.name ?? "Mijoz",
            rating,
            comment: text.trim().slice(0, 1000),
          });
          await sendChatMessage(chatId, t.reviewSaved);
        } catch {
          await sendChatMessage(chatId, t.notFound);
        }
        await showProduct(chatId, productId, t);
      }
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
    // SAYT/ILOVAGA KIRISH: t.me/<bot>?start=login_<kod> havolasi bosilganda
    // Telegram "/start login_<kod>" yuboradi. Kodni shu mijozga bog'laymiz -
    // saytdagi (yoki ilovadagi) oyna shundan keyin kirgan bo'ladi.
    const loginMatch = text.trim().match(/^\/start\s+login_([a-f0-9]{20,})$/i);
    if (loginMatch) {
      const attached = await attachLoginCode(loginMatch[1]!, {
        id: userId,
        firstName: params.firstName,
        lastName: params.lastName,
        username: params.username,
      });
      await sendChatMessage(
        chatId,
        attached ? t.loginApproved : t.loginExpired,
        { replyMarkup: mainMenuKeyboard(t) }
      );
      return;
    }

    if (command === "/start" || command.startsWith("/start ")) {
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
  const [action, arg1, arg2, arg3] = data.split("|");

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
    // ---- Savatdagi sonini o'zgartirish: q|+|id, q|-|id, q|x|id ----
    case "q": {
      const message = await changeCartItem(chatId, (arg1 as "+" | "-" | "x") ?? "+", arg2 ?? "", t);
      await answerCallbackQuery(callbackQueryId, message);
      await showCart(chatId, t);
      return;
    }
    // ---- Promokod ----
    case "promo": {
      await answerCallbackQuery(callbackQueryId);
      if (arg1 === "clear") {
        session.promoCode = null;
        await saveSession(chatId, session);
        await sendChatMessage(chatId, t.promoRemoved);
        await showCart(chatId, t);
      } else {
        session.state = "awaiting_promo";
        await saveSession(chatId, session);
        await sendChatMessage(chatId, t.promoPrompt);
      }
      return;
    }
    // ---- Sevimlilar ----
    case "fav": {
      await answerCallbackQuery(callbackQueryId);
      await showFavorites(chatId, t);
      return;
    }
    case "fv": {
      const message = await toggleFavorite(chatId, arg1 ?? "", t);
      await answerCallbackQuery(callbackQueryId, message);
      return;
    }
    // ---- Filtr ----
    case "flt": {
      await answerCallbackQuery(callbackQueryId);
      const category = (arg2 ?? "pipes") as ProductCategory;
      if (arg1 === "menu") await showFilterMenu(chatId, category, t);
      else await applyFilter(chatId, arg1 ?? "", category, arg3, t);
      return;
    }
    // ---- Sharhlar ----
    case "rv": {
      await answerCallbackQuery(callbackQueryId);
      await showReviews(chatId, arg1 ?? "", t);
      return;
    }
    case "rw": {
      await answerCallbackQuery(callbackQueryId);
      await askReviewRating(chatId, arg1 ?? "", t);
      return;
    }
    case "rs": {
      await answerCallbackQuery(callbackQueryId);
      session.state = "awaiting_review_text";
      session.reviewProductId = arg1;
      session.reviewRating = Math.min(5, Math.max(1, Number(arg2 ?? 5)));
      await saveSession(chatId, session);
      await sendChatMessage(chatId, t.reviewPrompt);
      return;
    }
    // ---- Blog ----
    case "blog": {
      await answerCallbackQuery(callbackQueryId);
      await showBlogList(chatId, Number(arg1 ?? 0), t);
      return;
    }
    case "bp": {
      await answerCallbackQuery(callbackQueryId);
      await showBlogPost(chatId, arg1 ?? "", t);
      return;
    }
    // ---- Kontakt / biz haqimizda ----
    case "info": {
      await answerCallbackQuery(callbackQueryId);
      await showContactInfo(chatId, t);
      return;
    }
    // ---- Buyurtmani bekor qilish ----
    case "oc": {
      await answerCallbackQuery(callbackQueryId);
      if (arg1 === "ask") {
        await sendChatMessage(chatId, `${t.cancelConfirmQ}\n#${(arg2 ?? "").slice(0, 8)}`, {
          replyMarkup: {
            inline_keyboard: [
              [{ text: t.cancelYes, callback_data: `oc|yes|${arg2}` }],
              [{ text: t.cancelNo, callback_data: "ords" }],
            ],
          },
        });
      } else if (arg1 === "yes") {
        const message = await cancelOwnOrder(chatId, arg2 ?? "", t);
        await sendChatMessage(chatId, message);
        await showMyOrders(chatId, t);
      }
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
