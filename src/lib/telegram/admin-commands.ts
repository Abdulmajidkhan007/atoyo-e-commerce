import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_UNIT } from "@/lib/products/taxonomy";
import { announceProduct, announceModeFor } from "./channel";
import { nextProductCode, findProductIdByCode } from "@/lib/products/product-code";
import { sendChatMessage } from "./bot";
import { startNewProductFlow, startEditProductFlow, cancelAdminSession } from "./admin-session";
import { sendBroadcast } from "@/lib/broadcast";
import { logAction } from "./action-log";
import type { Product, ProductCategory, ProductMaterial } from "@/types/product";
import type { Order } from "@/types/order";

/**
 * ADMIN BUYRUQLARI - FAQAT yopiq xodimlar guruhida ishlaydi.
 * Webhook (route.ts) bu funksiyani faqat xabar aynan TELEGRAM_CHAT_ID
 * guruhidan kelganida chaqiradi - shaxsiy chatdagi mijozlar bu
 * buyruqlarga hech qachon eta olmaydi.
 */

const CATEGORY_ALIASES: Record<string, ProductCategory> = {
  quvur: "pipes", quvurlar: "pipes", pipes: "pipes",
  mufta: "fittings", muftalar: "fittings", fittings: "fittings",
  kran: "faucets", kranlar: "faucets", faucets: "faucets",
  dush: "shower-systems", "shower-systems": "shower-systems",
  qozon: "boilers", qozonlar: "boilers", boilers: "boilers",
  radiator: "radiators", radiatorlar: "radiators", radiators: "radiators",
  nasos: "pumps", nasoslar: "pumps", pumps: "pumps",
  santexnika: "sanitary-ware", "sanitary-ware": "sanitary-ware",
};

const MATERIAL_ALIASES: Record<string, ProductMaterial> = {
  polipropilen: "polypropylene", polypropylene: "polypropylene",
  metalplastik: "metal-plastic", "metal-plastic": "metal-plastic",
  "po'lat": "steel", polat: "steel", steel: "steel",
  mis: "copper", copper: "copper",
  latun: "brass", brass: "brass",
  "cho'yan": "cast-iron", choyan: "cast-iron", "cast-iron": "cast-iron",
  pvx: "pvc", pvc: "pvc",
};

const HELP_TEXT = [
  "🛠 <b>Admin buyruqlari</b>",
  "",
  "<b>➕ Mahsulot qo'shish/tahrirlash (tugmali):</b>",
  "<code>/yangi</code> — yangi mahsulotni bosqichma-bosqich qo'shish",
  "<code>/tahrir 12</code> — mahsulotni tugmalar orqali tahrirlash (12 — mahsulot raqami)",
  "<code>/bekor</code> — joriy amalni bekor qilish",
  "",
  "<b>⚡ Tezkor buyruqlar:</b>",
  "<code>/top nomi</code> — mahsulot qidirish (raqamini olish)",
  "<code>/narx 12 50000</code> — narxni o'zgartirish",
  "<code>/zaxira 12 25</code> — zaxirani o'rnatish",
  "<code>/uchir 12</code> — katalogdan yashirish",
  "<code>/tikla 12</code> — qaytarish",
  "<code>/buyurtmalar</code> — so'nggi 5 buyurtma",
  "<code>/stat</code> — umumiy statistika",
  "<code>/elon Matn...</code> — barcha foydalanuvchilarga e'lon (Telegram + Email)",
].join("\n");

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

/**
 * Mahsulotni topadi. Buyruqlarda odatda QISQA RAQAM yoziladi
 * (`/narx 12 50000`), lekin eski uzun hujjat ID si ham ishlayveradi.
 */
async function findProduct(idOrCode: string): Promise<Product | null> {
  const trimmed = idOrCode.trim().replace(/^#|^№/, "");

  if (/^\d+$/.test(trimmed)) {
    const id = await findProductIdByCode(Number(trimmed));
    if (id) {
      const snap = await getAdminDb().collection("products").doc(id).get();
      if (snap.exists) return { id: snap.id, ...snap.data() } as Product;
    }
  }

  const byId = await getAdminDb().collection("products").doc(trimmed).get();
  if (byId.exists) return { id: byId.id, ...byId.data() } as Product;
  return null;
}

export async function handleAdminCommand(params: {
  chatId: number;
  threadId?: number;
  text: string;
  userId?: number;
}): Promise<void> {
  const { chatId, threadId, text, userId } = params;
  const reply = (message: string) => sendChatMessage(chatId, message, { threadId });

  const [rawCommand, ...rest] = text.trim().split(/\s+/);
  const command = (rawCommand ?? "").split("@")[0]?.toLowerCase() ?? "";
  const argsText = text.trim().slice((rawCommand ?? "").length).trim();

  try {
    switch (command) {
      case "/start":
      case "/yordam":
      case "/help": {
        await reply(HELP_TEXT);
        return;
      }

      case "/stat": {
        const statsDoc = await getAdminDb().collection("stats").doc("summary").get();
        const stats = statsDoc.data() ?? {};
        const productsCount = await getAdminDb().collection("products").where("isActive", "==", true).count().get();
        await reply(
          [
            "📊 <b>Statistika</b>",
            `Buyurtmalar: <b>${stats.totalOrders ?? 0}</b>`,
            `Tushum: <b>${formatSom(stats.totalRevenue ?? 0)}</b>`,
            `Faol mahsulotlar: <b>${productsCount.data().count}</b>`,
          ].join("\n")
        );
        return;
      }

      case "/buyurtmalar": {
        const snapshot = await getAdminDb().collection("orders").orderBy("createdAt", "desc").limit(5).get();
        if (snapshot.empty) {
          await reply("Hozircha buyurtmalar yo'q.");
          return;
        }
        const lines = snapshot.docs.map((d) => {
          const o = d.data() as Order;
          return `#${d.id.slice(0, 8)} — ${o.customerName}, ${formatSom(o.totalAmount)} [${o.status}]`;
        });
        await reply(`🧾 <b>So'nggi buyurtmalar</b>\n\n${lines.join("\n")}`);
        return;
      }

      case "/top": {
        if (!argsText) {
          await reply("Foydalanish: <code>/top kran</code>");
          return;
        }
        const term = argsText.toLowerCase();
        const snapshot = await getAdminDb()
          .collection("products")
          .orderBy("nameSearchIndex")
          .startAt(term)
          .endAt(term + "")
          .limit(5)
          .get();
        if (snapshot.empty) {
          await reply(`"${argsText}" bo'yicha hech narsa topilmadi.`);
          return;
        }
        const lines = snapshot.docs.map((d) => {
          const p = d.data() as Product;
          return `${p.name}\n  🆔 <b>${p.code ?? d.id}</b> | ${formatSom(p.price)} | zaxira: ${p.stock}${p.isActive ? "" : " | 🚫 yashirin"}`;
        });
        await reply(`🔎 Topildi:\n\n${lines.join("\n\n")}`);
        return;
      }

      case "/narx":
      case "/zaxira": {
        const [id, valueRaw] = argsText.split(/\s+/);
        const value = Number(valueRaw);
        if (!id || Number.isNaN(value) || value < 0) {
          await reply(`Foydalanish: <code>${command} 12 ${command === "/narx" ? "50000" : "25"}</code> (12 — mahsulot raqami)`);
          return;
        }
        const product = await findProduct(id);
        if (!product) {
          await reply("Mahsulot topilmadi. Raqamini <code>/top nomi</code> bilan oling.");
          return;
        }
        const field = command === "/narx" ? "price" : "stock";
        await getAdminDb().collection("products").doc(id).update({ [field]: value, updatedAt: Date.now() });
        // Narx o'zgarishi kanalda "yangilandi" bo'lib chiqadi; zaxira esa
        // faqat mahsulot tugab qolib qayta kelgan bo'lsa.
        const afterField = { ...product, [field]: value } as Product;
        await announceProduct(afterField, announceModeFor(product, afterField));
        await reply(`✅ <b>${product.name}</b>\n${command === "/narx" ? `Yangi narx: ${formatSom(value)}` : `Yangi zaxira: ${value} dona`}`);
        return;
      }

      case "/elon": {
        if (!argsText) {
          await reply("Foydalanish: <code>/elon Yangi aksiya boshlandi! ...</code>");
          return;
        }
        await reply("📤 E'lon yuborilmoqda, kuting...");
        const result = await sendBroadcast({ title: "Atoyo Santexnika", body: argsText });
        await reply(`✅ E'lon yuborildi — Telegram: ${result.telegramSent} ta, Email: ${result.emailSent} ta.`);
        await logAction(`📢 E'lon yuborildi (guruhdan): Telegram ${result.telegramSent}, Email ${result.emailSent}`);
        return;
      }

      case "/bekor": {
        if (userId) await cancelAdminSession(chatId, threadId, userId);
        else await reply("Bekor qilish uchun ma'lumot topilmadi.");
        return;
      }

      case "/yangi": {
        // Argument berilmasa - interaktiv (tugmali) oqimni boshlaymiz.
        if (!argsText) {
          if (userId) await startNewProductFlow(chatId, threadId, userId);
          else await reply("Interaktiv rejim uchun foydalanuvchi aniqlanmadi.");
          return;
        }
        const parts = argsText.split("|").map((s) => s.trim());
        const [name, categoryRaw, priceRaw, stockRaw, brand, country, materialRaw] = parts;
        const category = CATEGORY_ALIASES[(categoryRaw ?? "").toLowerCase()];
        const price = Number(priceRaw);
        const stock = Number(stockRaw);
        if (!name || !category || Number.isNaN(price) || Number.isNaN(stock)) {
          await reply(
            "Foydalanish:\n<code>/yangi Sharli kran 1/2 | kran | 45000 | 30 | Valtec | Italiya | latun</code>\n(brend/davlat/material ixtiyoriy)"
          );
          return;
        }
        const material = MATERIAL_ALIASES[(materialRaw ?? "").toLowerCase()] ?? "brass";
        const now = Date.now();
        const ref = getAdminDb().collection("products").doc();
        const product: Product = {
          id: ref.id,
          // Odamlar uchun qisqa tartib raqami (1, 2, 3...).
          code: await nextProductCode(),
          slug: `${name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")}-${ref.id.slice(0, 6)}`,
          name,
          nameSearchIndex: name.toLowerCase(),
          description: "",
          category,
          brand: brand ?? "",
          manufacturerCountry: country ?? "",
          material,
          unit: DEFAULT_UNIT,
    dimensions: {},
          price,
          discountPrice: null,
          currency: "UZS",
          stock,
          images: [],
          thumbnailUrl: "",
          isActive: true,
          salesCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        await ref.set(product);
        await announceProduct(product, "new");
        await reply(`✅ Qo'shildi: <b>${name}</b>\n🆔 ID: <b>${product.code}</b> | ${formatSom(price)} | ${stock} dona\n\nRasmni admin paneldan yuklang: atoyo-uz.web.app/admin/katalog`);
        return;
      }

      case "/tahrir": {
        const [id, ...pairs] = argsText.split(/\s+/);
        if (!id) {
          await reply("Foydalanish: <code>/tahrir 12</code> — tugmali tahrirlash.\nRaqamini <code>/top nomi</code> bilan oling.");
          return;
        }
        // Faqat ID berilsa - interaktiv (tugmali) tahrirlash menyusi.
        if (pairs.length === 0) {
          if (userId) {
            const started = await startEditProductFlow(chatId, threadId, userId, id);
            if (!started) await reply("Mahsulot topilmadi. Raqamini tekshiring.");
          } else {
            await reply("Interaktiv rejim uchun foydalanuvchi aniqlanmadi.");
          }
          return;
        }
        const product = await findProduct(id);
        if (!product) {
          await reply("Mahsulot topilmadi.");
          return;
        }
        // nomi=... bo'sh joyli bo'lishi mumkin - kalit=qiymat juftlarini qayta yig'amiz
        const updates: Record<string, unknown> = { updatedAt: Date.now() };
        const joined = pairs.join(" ");
        const fieldRegex = /(nomi|narx|zaxira|chegirma|brend|davlat)=([^=]*?)(?=\s+\w+=|$)/g;
        for (const match of joined.matchAll(fieldRegex)) {
          const key = match[1];
          const value = (match[2] ?? "").trim();
          if (key === "nomi" && value) {
            updates.name = value;
            updates.nameSearchIndex = value.toLowerCase();
          }
          if (key === "narx" && !Number.isNaN(Number(value))) updates.price = Number(value);
          if (key === "zaxira" && !Number.isNaN(Number(value))) updates.stock = Number(value);
          if (key === "chegirma") updates.discountPrice = value ? Number(value) : null;
          if (key === "brend") updates.brand = value;
          if (key === "davlat") updates.manufacturerCountry = value;
        }
        if (Object.keys(updates).length === 1) {
          await reply("Hech qanday o'zgarish topilmadi. Masalan: <code>narx=50000</code>");
          return;
        }
        await getAdminDb().collection("products").doc(id).update(updates);
        const afterEdit = { ...product, ...updates } as Product;
        await announceProduct(afterEdit, announceModeFor(product, afterEdit));
        await reply(`✅ <b>${product.name}</b> yangilandi (${Object.keys(updates).filter((k) => k !== "updatedAt").join(", ")}).`);
        return;
      }

      case "/uchir":
      case "/tikla": {
        const id = argsText.split(/\s+/)[0];
        if (!id) {
          await reply(`Foydalanish: <code>${command} 12</code> (12 — mahsulot raqami)`);
          return;
        }
        const product = await findProduct(id);
        if (!product) {
          await reply("Mahsulot topilmadi.");
          return;
        }
        const isActive = command === "/tikla";
        await getAdminDb().collection("products").doc(id).update({ isActive, updatedAt: Date.now() });
        const afterVisibility = { ...product, isActive } as Product;
        await announceProduct(afterVisibility, announceModeFor(product, afterVisibility));
        await reply(isActive ? `✅ <b>${product.name}</b> katalogga qaytarildi.` : `🚫 <b>${product.name}</b> katalogdan yashirildi.`);
        return;
      }

      default:
        // Guruhdagi oddiy suhbatga aralashmaymiz - faqat "/" bilan
        // boshlangan noma'lum buyruqlarga yordam ko'rsatamiz.
        if (command.startsWith("/")) await reply(HELP_TEXT);
    }
  } catch (error) {
    console.error("Admin buyrug'ini bajarishda xato:", error);
    await reply("❌ Buyruqni bajarishda xatolik yuz berdi.").catch(() => {});
  }
}
