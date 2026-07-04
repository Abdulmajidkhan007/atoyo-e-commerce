import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendChatMessage, answerCallbackQuery } from "./bot";
import { createOrder } from "@/lib/orders/create-order";
import type { Product, ProductCategory } from "@/types/product";
import type { OrderItem } from "@/types/order";

/**
 * MIJOZ-BOT - FAQAT shaxsiy (private) chatlarda ishlaydi. Webhook bu
 * modulni faqat chat.type === "private" bo'lganda chaqiradi, shuning
 * uchun bu oqim admin guruh buyruqlariga hech qanday yo'l ochmaydi.
 *
 * Holat mashinasi Firestore `botSessions/{chatId}` hujjatida saqlanadi:
 * savat, checkout bosqichi (ism -> telefon -> yakun).
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
  state: "idle" | "awaiting_name" | "awaiting_phone";
  cart: OrderItem[];
  customerName?: string;
  updatedAt: number;
}

interface InlineButton {
  text: string;
  callback_data: string;
}

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
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
      [{ text: "🛒 Savat", callback_data: "crt" }],
    ],
  };
}

async function showMainMenu(chatId: number): Promise<void> {
  await sendChatMessage(
    chatId,
    "🏪 <b>Atoyo Santexnika</b> botiga xush kelibsiz!\n\nKatalogdan mahsulot tanlab, shu yerning o'zida buyurtma bering. Sayt: atoyo-uz.netlify.app",
    { replyMarkup: mainMenuKeyboard() }
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

async function startCheckout(chatId: number): Promise<void> {
  const session = await getSession(chatId);
  if (session.cart.length === 0) {
    await showCart(chatId);
    return;
  }
  session.state = "awaiting_name";
  await saveSession(chatId, session);
  await sendChatMessage(chatId, "👤 Ism-familiyangizni yozib yuboring:");
}

/** Shaxsiy chatdagi matnli xabarlar (checkout bosqichlari yoki menyu). */
export async function handleCustomerMessage(chatId: number, text: string): Promise<void> {
  const session = await getSession(chatId);

  if (session.state === "awaiting_name") {
    const name = text.trim();
    if (name.length < 2) {
      await sendChatMessage(chatId, "Iltimos, to'liq ism-familiyangizni yozing:");
      return;
    }
    session.customerName = name;
    session.state = "awaiting_phone";
    await saveSession(chatId, session);
    await sendChatMessage(chatId, "📞 Telefon raqamingizni yozing (masalan +998901234567):");
    return;
  }

  if (session.state === "awaiting_phone") {
    const phone = text.trim().replace(/[\s-]/g, "");
    if (!/^\+?\d{9,15}$/.test(phone)) {
      await sendChatMessage(chatId, "Raqam noto'g'ri ko'rinadi. Masalan: +998901234567");
      return;
    }

    const order = await createOrder({
      customerName: session.customerName ?? "Telegram mijoz",
      phoneNumber: phone,
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
    return;
  }

  // Oddiy holat: har qanday matn (shu jumladan /start) bosh menyuni ochadi.
  await showMainMenu(chatId);
}

/** Shaxsiy chatdagi inline tugma bosishlari. */
export async function handleCustomerCallback(params: {
  chatId: number;
  callbackQueryId: string;
  data: string;
}): Promise<void> {
  const { chatId, callbackQueryId, data } = params;
  const [action, arg1, arg2] = data.split("|");

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
    case "clr": {
      await saveSession(chatId, { state: "idle", cart: [], updatedAt: Date.now() });
      await answerCallbackQuery(callbackQueryId, "Savat tozalandi.");
      await showCart(chatId);
      return;
    }
    case "chk": {
      await answerCallbackQuery(callbackQueryId);
      await startCheckout(chatId);
      return;
    }
    default:
      await answerCallbackQuery(callbackQueryId);
  }
}
