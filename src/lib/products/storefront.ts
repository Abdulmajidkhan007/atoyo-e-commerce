import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { getTaxonomy } from "./taxonomy-server";
import { queryProductsPage } from "./catalog-server";
import { getPricingSettings } from "./pricing-settings";
import { storefrontRole, toViewerProducts } from "./viewer";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { getSiteSettings } from "@/lib/firebase/admin-content";
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
    const role = storefrontRole(viewer?.role);

    /**
     * ARALASH BIRINCHI EKRAN (`SiteSettings.catalogMix`).
     *
     * Filtrsiz katalog ochilganda birinchi sahifa har kategoriyadan
     * navbatma-navbat yig'iladi - aks holda oxirgi partiya kirim
     * butun ekranni egallaydi (20 ta cho'tka muammosi).
     *
     * Kursor QAYTARILMAYDI (`null`): keyingi sahifa odatdagi
     * "yangilaridan" boshlanadi, allaqachon ko'rsatilgani esa
     * `ProductGrid` da ID bo'yicha tashlab yuboriladi.
     */
    if (await shouldMixCatalog(filters)) {
      const mixed = await loadMixedCatalogRaw(await mixSize(pageSize));
      if (mixed.length > 0) {
        return {
          products: toViewerProducts(mixed, role, pricing),
          nextCursor: null,
          hasMore: true,
        };
      }
    }

    const page = await queryProductsPage(filters, pageSize, null);
    return {
      products: toViewerProducts(page.products, role, pricing),
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

/* ------------------------------------------------------------------ */
/*  ARALASH KATALOG (birinchi ekran)                                   */
/* ------------------------------------------------------------------ */

/** Aralash ekranda ko'pi bilan shuncha kategoriya ko'rib chiqiladi. */
const MIX_MAX_CATEGORIES = 20;

let mixCache: { at: number; size: number; products: Product[] } | null = null;
const MIX_TTL = 5 * 60 * 1000;

/**
 * Aralashtirish FAQAT filtrsiz va "yangilari" tartibida ishlaydi.
 *
 * Mijoz kategoriya tanlagan yoki narx bo'yicha saralagan bo'lsa - u
 * ANIQ narsa so'ragan, tartibni buzish xizmat emas, xalaqit.
 */
async function shouldMixCatalog(filters: ProductFilterParams): Promise<boolean> {
  const filtered =
    Boolean(filters.category) ||
    Boolean(filters.brand) ||
    Boolean(filters.material) ||
    Boolean(filters.manufacturerCountry) ||
    filters.inStockOnly === true ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined;

  if (filtered) return false;
  if (filters.sortBy && filters.sortBy !== "newest") return false;

  try {
    const settings = await getSiteSettings();
    return settings.catalogMix !== false;
  } catch {
    // Sozlama o'qilmasa aralashtirmaymiz - odatdagi tartib xavfsizroq.
    return false;
  }
}

/** Sozlamadagi hajm (12-48), o'qilmasa - sahifa hajmi. */
async function mixSize(fallback: number): Promise<number> {
  try {
    const value = Number((await getSiteSettings()).catalogMixCount);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(Math.max(Math.round(value), 12), 48);
  } catch {
    return fallback;
  }
}

/**
 * NAVBATMA-NAVBAT QO'SHISH (sof funksiya, testi `storefront.test.ts`).
 *
 * Kirish - har kategoriya uchun alohida ro'yxat; chiqish - bitta
 * ro'yxat: avval har kategoriyaning 1-mahsuloti, keyin 2-si va h.k.
 * Shu tufayli ekranning boshida kategoriyalar TAKRORLANMAYDI.
 * Tugagan kategoriya shunchaki tashlab ketiladi.
 */
export function roundRobin<T>(groups: T[][], limit: number): T[] {
  const result: T[] = [];
  const longest = groups.reduce((max, group) => Math.max(max, group.length), 0);

  for (let index = 0; index < longest && result.length < limit; index += 1) {
    for (const group of groups) {
      if (result.length >= limit) break;
      const item = group[index];
      if (item !== undefined) result.push(item);
    }
  }

  return result;
}

/**
 * ARALASH RO'YXAT (xom hujjatlar - tannarx bilan!).
 *
 * Chaqiruvchi `toViewerProducts()` ni O'ZI qo'llashi SHART.
 * 5 daqiqa keshlanadi: har kategoriya uchun alohida so'rov ketadi
 * (20 tagacha), har katalog ochilganda buni takrorlash isrof.
 */
export async function loadMixedCatalogRaw(size: number): Promise<Product[]> {
  if (mixCache && mixCache.size === size && Date.now() - mixCache.at < MIX_TTL) {
    return mixCache.products;
  }

  const taxonomy = await getTaxonomy();
  const categories = taxonomy.categories.slice(0, MIX_MAX_CATEGORIES);
  if (categories.length === 0) return [];

  const db = getAdminDb();
  // Har kategoriyadan shuncha olinadi - yetmay qolmasligi uchun +1.
  const perCategory = Math.ceil(size / categories.length) + 1;

  const groups = await Promise.all(
    categories.map(async (category) => {
      try {
        const snapshot = await db
          .collection("products")
          .where("isActive", "==", true)
          .where("category", "==", category.slug)
          .orderBy("createdAt", "desc")
          .limit(perCategory)
          .get();

        return snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
          .filter((product) => !product.isDraft);
      } catch (error) {
        // Bitta kategoriya o'qilmasa butun katalog yiqilmaydi.
        console.error(`Aralash katalog: "${category.slug}" o'qilmadi:`, error);
        return [];
      }
    })
  );

  const products = roundRobin(groups, size);
  mixCache = { at: Date.now(), size, products };
  return products;
}

/* ------------------------------------------------------------------ */
/*  KATEGORIYA CHIPLARI                                                */
/* ------------------------------------------------------------------ */

let chipCache: { at: number; categories: { slug: string; label: string }[] } | null = null;

/**
 * MAHSULOTI BOR kategoriyalar (chiplar uchun), taksonomiya tartibida.
 *
 * Bo'sh kategoriya chipda turmasligi kerak: uni bosgan mijoz "hech
 * narsa topilmadi" ko'rib ketib qoladi. Har kategoriyaga bitta
 * `limit(1)` so'rov ketadi, natija 5 daqiqa keshlanadi.
 * Xato bo'lsa (baza o'qilmasa) bo'sh ro'yxat — chiplar shunchaki
 * ko'rinmaydi, sahifa yiqilmaydi.
 */
export async function loadChipCategories(): Promise<{ slug: string; label: string }[]> {
  if (chipCache && Date.now() - chipCache.at < MIX_TTL) return chipCache.categories;

  try {
    const taxonomy = await getTaxonomy();
    const db = getAdminDb();
    const checks = await Promise.all(
      taxonomy.categories.slice(0, MIX_MAX_CATEGORIES).map(async (category) => {
        try {
          const snapshot = await db
            .collection("products")
            .where("isActive", "==", true)
            .where("category", "==", category.slug)
            .limit(1)
            .select()
            .get();
          return snapshot.empty ? null : { slug: category.slug, label: category.label };
        } catch {
          return null;
        }
      })
    );
    const categories = checks.filter((item): item is { slug: string; label: string } => item !== null);
    chipCache = { at: Date.now(), categories };
    return categories;
  } catch (error) {
    console.error("Kategoriya chiplarini o'qib bo'lmadi:", error);
    return [];
  }
}

/** Sozlama saqlanganda aralash ro'yxat darhol yangilansin. */
export function clearMixCache(): void {
  mixCache = null;
  showcaseCache = null;
  chipCache = null;
}
