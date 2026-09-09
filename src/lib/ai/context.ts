import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { getDeliverySettings } from "@/lib/orders/pricing";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { searchTermVariants } from "@/lib/search/tokens";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { markupFor, priceForRole } from "@/lib/products/wholesale";
import { formatSom } from "@/lib/format";
import type { Product } from "@/types/product";
import type { UserRole } from "@/types/user";

/**
 * YORDAMCHI UCHUN "HAQIQAT MANBAI".
 *
 * Model o'zidan narx/zaxira o'ylab topmasligi uchun javob yozishdan
 * oldin savolga mos mahsulotlar Firestore'dan olinadi va kontekstga
 * qo'yiladi. Do'kon ma'lumotlari (telefon, manzil, yetkazish narxi,
 * kategoriyalar) esa 5 daqiqa keshlanadi - har savolda qayta o'qilmaydi.
 */

export interface GroundedProduct {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  brand: string;
  category: string;
  url: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.atoyo.uz";
const CACHE_TTL = 5 * 60 * 1000;

let shopCache: { text: string; at: number } | null = null;

/** Do'kon haqidagi umumiy ma'lumot (keshlanadi). */
export async function buildShopContext(): Promise<string> {
  if (shopCache && Date.now() - shopCache.at < CACHE_TTL) return shopCache.text;

  const [settings, delivery, taxonomy] = await Promise.all([
    getSiteSettings(),
    getDeliverySettings(),
    getTaxonomy(),
  ]);

  const zones = delivery.zones ?? [];
  const deliveryText = !delivery.enabled
    ? "Yetkazib berish narxi hozircha sozlanmagan — operator aniqlashtiradi."
    : [
        `Standart yetkazib berish: ${formatSom(delivery.fee)}.`,
        delivery.freeFrom > 0 ? `${formatSom(delivery.freeFrom)} dan yuqori buyurtmaga bepul.` : "",
        zones.length > 0
          ? `Hududlar: ${zones.map((zone) => `${zone.name} — ${formatSom(zone.fee)}`).join("; ")}.`
          : "",
      ]
        .filter(Boolean)
        .join(" ");

  const text = [
    "Do'kon: Atoyo Santexnika & Otopleniye — santexnika va isitish tizimlari do'koni.",
    `Telefon: ${settings.phone}. Email: ${settings.email}. Manzil: ${settings.address}.`,
    `Sayt: ${SITE_URL}`,
    `Kategoriyalar: ${taxonomy.categories.map((item) => item.label).join(", ")}.`,
    `Materiallar: ${taxonomy.materials.map((item) => item.label).join(", ")}.`,
    deliveryText,
    "To'lov: hozircha naqd (kuryerga) — onlayn to'lov ulanish bosqichida.",
    "Buyurtma: saytdan, mobil ilovadan yoki Telegram bot orqali beriladi; operator tasdiqlaydi.",
    `Do'kon haqida: ${settings.about.body.replace(/\s+/g, " ").slice(0, 600)}`,
  ].join("\n");

  shopCache = { text, at: Date.now() };
  return text;
}

/**
 * Savolga mos mahsulotlar (nom, brend, artikul va maxsus kalit so'zlar
 * bo'yicha). Narx so'rovchining roliga moslanadi - bazadagi qiymat
 * optom narx, oddiy mijoz uni ko'rmasligi kerak.
 */
export async function findRelevantProducts(
  term: string,
  limitCount = 8,
  viewerRole?: UserRole
): Promise<GroundedProduct[]> {
  const variants = searchTermVariants(term, 10);
  const db = getAdminDb();
  const found = new Map<string, Product>();

  const collect = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => {
    for (const doc of docs) {
      const product = { id: doc.id, ...doc.data() } as Product;
      if (product.isActive === false || product.isDraft) continue;
      found.set(product.id, product);
    }
  };

  if (variants.length > 0) {
    try {
      const [byToken, byKeyword] = await Promise.all([
        db.collection("products").where("nameTokens", "array-contains-any", variants).limit(limitCount * 2).get(),
        db.collection("products").where("keywords", "array-contains-any", variants).limit(limitCount).get(),
      ]);
      collect(byToken.docs);
      collect(byKeyword.docs);
    } catch (error) {
      // Indeks yo'q bo'lsa yoki so'rov xato bersa - yordamchi baribir
      // javob berishi kerak, faqat mahsulotsiz.
      console.error("Yordamchi uchun mahsulot qidirishda xato:", error);
    }
  }

  // Hech narsa topilmasa - eng ko'p sotilgan mahsulotlar taklif qilinadi.
  if (found.size === 0) {
    try {
      const popular = await db
        .collection("products")
        .where("isActive", "==", true)
        .orderBy("salesCount", "desc")
        .limit(limitCount)
        .get();
      collect(popular.docs);
    } catch {
      /* bo'sh ro'yxat ham yetarli */
    }
  }

  const settings = await getPricingSettings();
  const show = (product: Product, value: number) =>
    priceForRole(value, viewerRole, markupFor(product, settings));

  return Array.from(found.values())
    // Zaxirasi bori oldinda - mijozga darhol taklif qilish mumkin bo'lganlari.
    .sort((a, b) => Number((b.stock ?? 0) > 0) - Number((a.stock ?? 0) > 0) || (b.salesCount ?? 0) - (a.salesCount ?? 0))
    .slice(0, limitCount)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: show(product, product.price),
      discountPrice: product.discountPrice ? show(product, product.discountPrice) : null,
      stock: product.stock ?? 0,
      brand: product.brand ?? "",
      category: product.category,
      url: `${SITE_URL}/mahsulot/${product.id}`,
    }));
}

/** Mahsulotlarni model o'qiydigan qisqa matnga aylantiradi. */
export function formatProducts(products: GroundedProduct[]): string {
  if (products.length === 0) return "Mos mahsulot topilmadi.";
  return products
    .map((product) => {
      const price = product.discountPrice && product.discountPrice < product.price
        ? `${formatSom(product.discountPrice)} (eski narx ${formatSom(product.price)})`
        : formatSom(product.price);
      const stock = product.stock > 0 ? `zaxirada ${product.stock} dona` : "ZAXIRADA YO'Q";
      return `- ${product.name}${product.brand ? ` (${product.brand})` : ""} | ${price} | ${stock} | ${product.url}`;
    })
    .join("\n");
}
