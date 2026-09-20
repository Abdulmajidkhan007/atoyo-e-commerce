import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { getTaxonomy } from "./taxonomy-server";
import { queryProductsPage } from "./catalog-server";
import { getPricingSettings } from "./pricing-settings";
import { storefrontRole, toViewerProducts } from "./viewer";
import { getCurrentAppUser } from "@/lib/firebase/session";
import type { Product, ProductFilterParams } from "@/types/product";

/**
 * KATALOGNING BIRINCHI SAHIFASI — SERVERDA.
 *
 * Nega kerak: katalog sahifasi client komponent edi va mahsulotlar
 * faqat brauzerda JS ishga tushgach kelardi. Natijada Google (va
 * sekin internetdagi mijoz) ko'radigan birinchi HTML'da
 * "Hech qanday mahsulot topilmadi" deb turardi — do'kon bo'm-bo'sh
 * ko'rinardi.
 *
 * NARX MAXFIYLIGI (CLAUDE.md 1-qoida): natija HAR DOIM
 * `toViewerProducts()` dan o'tadi va rol `storefrontRole()` bilan
 * aniqlanadi — vitrina hamma uchun MIJOZ oynasi, xodim ham bu yerda
 * dona narxni ko'radi. Optom mijoz esa o'z narxini ko'radi.
 */
export async function loadStorefrontPage(
  filters: ProductFilterParams,
  pageSize = 24
): Promise<{ products: Product[]; nextCursor: string | null; hasMore: boolean }> {
  try {
    const [viewer, pricing] = await Promise.all([
      getCurrentAppUser().catch(() => null),
      getPricingSettings(),
    ]);
    const page = await queryProductsPage(filters, pageSize, null);
    return {
      products: toViewerProducts(page.products, storefrontRole(viewer?.role), pricing),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    };
  } catch (error) {
    // Baza o'qilmasa sahifa BARIBIR ochiladi - client tomoni
    // o'zi qayta so'raydi. Bo'sh ro'yxat "mahsulot yo'q" degani emas.
    console.error("Katalogning birinchi sahifasini serverda o'qib bo'lmadi:", error);
    return { products: [], nextCursor: null, hasMore: true };
  }
}

/** Bosh sahifadagi namuna: nechta mahsulot (= nechta kategoriya). */
const SHOWCASE_SIZE = 6;
/** Bitta kategoriyadan shuncha nomzod (zaxirasi borini tanlash uchun). */
const SHOWCASE_CANDIDATES = 5;
/** Ko'rib chiqiladigan kategoriyalar chegarasi. */
const SHOWCASE_MAX_CATEGORIES = 14;

let showcaseCache: { at: number; products: Product[] } | null = null;
const SHOWCASE_TTL = 5 * 60 * 1000;

/**
 * BOSH SAHIFA NAMUNASI — HAR KATEGORIYADAN BITTADAN (xom hujjatlar).
 *
 * Bu funksiya `/api/products/showcase` va bosh sahifaning SERVER
 * renderi uchun BITTA manba: ilgari mantiq faqat route ichida edi va
 * bosh sahifa uni HTMLga chiqara olmasdi.
 *
 * DIQQAT: xom hujjat qaytaradi (tannarx bilan) - chaqiruvchi
 * `toViewerProducts()` ni O'ZI qo'llashi SHART. Route shunday qiladi;
 * sahifa uchun `loadShowcaseForViewer()` bor.
 */
export async function loadShowcaseRaw(): Promise<Product[]> {
  if (showcaseCache && Date.now() - showcaseCache.at < SHOWCASE_TTL) {
    return showcaseCache.products;
  }

  const taxonomy = await getTaxonomy();
  const db = getAdminDb();
  const picked: Product[] = [];

  for (const category of taxonomy.categories.slice(0, SHOWCASE_MAX_CATEGORIES)) {
    if (picked.length >= SHOWCASE_SIZE) break;

    const snapshot = await db
      .collection("products")
      .where("isActive", "==", true)
      .where("category", "==", category.slug)
      .orderBy("createdAt", "desc")
      .limit(SHOWCASE_CANDIDATES)
      .get();

    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
      .filter((product) => !product.isDraft);
    if (items.length === 0) continue;

    // Zaxirasi bori oldinda: mijoz darhol sotib ola oladigan mahsulot.
    picked.push(items.find((product) => (product.stock ?? 0) > 0) ?? items[0]!);
  }

  showcaseCache = { at: Date.now(), products: picked };
  return picked;
}

/** Namuna ro'yxati, narxi ko'ruvchiga moslangan (sahifa uchun). */
export async function loadShowcaseForViewer(): Promise<Product[]> {
  try {
    const [viewer, pricing, products] = await Promise.all([
      getCurrentAppUser().catch(() => null),
      getPricingSettings(),
      loadShowcaseRaw(),
    ]);
    return toViewerProducts(products, storefrontRole(viewer?.role), pricing);
  } catch (error) {
    console.error("Bosh sahifa namunasini serverda o'qib bo'lmadi:", error);
    return [];
  }
}
