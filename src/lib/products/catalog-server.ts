import "server-only";
import type { Query } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { searchTermVariants } from "@/lib/search/tokens";
import type { Product, ProductFilterParams } from "@/types/product";

/**
 * KATALOGNI SERVER TOMONDA O'QISH.
 *
 * Ilgari bu so'rovlar mijozning brauzerida (Firebase client SDK bilan)
 * ketardi. Shu sababli `products` kolleksiyasi hammaga ochiq bo'lishi
 * SHART edi va u bilan birga OPTOM NARX ham, TANNARX ham ochiq ketardi.
 *
 * Endi o'qish serverda: Firestore qoidalarida `products` yopilgan,
 * mijozga esa `lib/products/viewer.ts` orqali tozalangan hujjat
 * beriladi. Filtr va saralash avvalgidek BAZA TOMONIDA bo'ladi —
 * 10 000+ mahsulotni serverga tortib olish yo'q.
 *
 * Sahifalash "kursor" bilan: kursor — oxirgi hujjatning ID si.
 * Snapshot'ni JSON'da uzatib bo'lmaydi, shuning uchun keyingi
 * sahifada o'sha hujjat bir marta o'qib olinadi va `startAfter`
 * ga beriladi (bitta qo'shimcha o'qish, lekin har doim to'g'ri
 * tartib — hatto bir xil narxli mahsulotlarda ham).
 */

const COLLECTION = "products";

export interface ServerProductsPage {
  products: Product[];
  /** Keyingi sahifa uchun kursor (oxirgi hujjat ID si). */
  nextCursor: string | null;
  hasMore: boolean;
}

function docToProduct(doc: {
  id: string;
  data: () => Record<string, unknown>;
}): Product {
  return { id: doc.id, ...doc.data() } as Product;
}

/**
 * Filtrlangan va saralangan sahifa.
 *
 * `filters.minPrice` / `maxPrice` — BAZADAGI (optom) qiymatlarda
 * bo'lishi kerak; ko'rsatilgan narxdan o'girish chaqiruvchining
 * vazifasi (`filterPriceToWholesale`).
 */
export async function queryProductsPage(
  filters: ProductFilterParams,
  pageSize = 24,
  cursorId: string | null = null
): Promise<ServerProductsPage> {
  const collection = getAdminDb().collection(COLLECTION);
  let q: Query = collection.where("isActive", "==", true);

  if (filters.category) q = q.where("category", "==", filters.category);
  if (filters.brand) q = q.where("brand", "==", filters.brand);
  if (filters.material) q = q.where("material", "==", filters.material);
  if (filters.manufacturerCountry) {
    q = q.where("manufacturerCountry", "==", filters.manufacturerCountry);
  }
  if (filters.inStockOnly) q = q.where("stock", ">", 0);
  if (filters.minPrice !== undefined) q = q.where("price", ">=", filters.minPrice);
  if (filters.maxPrice !== undefined) q = q.where("price", "<=", filters.maxPrice);

  switch (filters.sortBy) {
    case "price-asc":
      q = q.orderBy("price", "asc");
      break;
    case "price-desc":
      q = q.orderBy("price", "desc");
      break;
    case "popular":
      q = q.orderBy("salesCount", "desc");
      break;
    default:
      q = q.orderBy("createdAt", "desc");
  }

  if (cursorId) {
    const cursorDoc = await collection.doc(cursorId).get();
    if (cursorDoc.exists) q = q.startAfter(cursorDoc);
  }

  try {
    const snapshot = await q.limit(pageSize).get();
    const products = snapshot.docs.map(docToProduct);

    return {
      products,
      nextCursor: snapshot.docs.at(-1)?.id ?? null,
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error) {
    // INDEKS YO'Q bo'lsa katalog BUTUNLAY bo'sh qolmasin: soddaroq
    // so'rov bilan (saralashsiz) o'qib, tartibni xotirada beramiz.
    // Bosh sahifa ishlab, katalog "Hech qanday mahsulot topilmadi"
    // deb turishi aynan shundan bo'lgan edi.
    if (!isMissingIndex(error)) throw error;
    console.error("Katalog indeksi yo'q - zaxira so'rov ishlatilyapti:", error);
    return fallbackPage(filters, pageSize, cursorId);
  }
}

/**
 * Zaxira so'rovda bazadan `pageSize` ning shuncha barobari o'qiladi
 * (zaxira/narx filtri xotirada qo'llangani uchun).
 */
const RAW_OVERFETCH = 4;

/** Firestore "kompozit indeks kerak" deb yiqilganmi? */
function isMissingIndex(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /requires an index|FAILED_PRECONDITION/i.test(message);
}

/**
 * ZAXIRA SO'ROV: faqat tenglik filtrlari + hujjat ID si bo'yicha
 * tartib (bunga kompozit indeks KERAK EMAS). Saralash sahifa ichida,
 * xotirada bajariladi - ya'ni tartib to'liq to'g'ri bo'lmasligi
 * mumkin, lekin katalog ishlaydi va mijoz mahsulotni ko'radi.
 *
 * To'g'ri tartib uchun indekslarni deploy qiling:
 *   firebase deploy --only firestore:indexes
 */
async function fallbackPage(
  filters: ProductFilterParams,
  pageSize: number,
  cursorId: string | null
): Promise<ServerProductsPage> {
  const collection = getAdminDb().collection(COLLECTION);
  let q: Query = collection.where("isActive", "==", true);

  if (filters.category) q = q.where("category", "==", filters.category);
  if (filters.brand) q = q.where("brand", "==", filters.brand);
  if (filters.material) q = q.where("material", "==", filters.material);
  if (filters.manufacturerCountry) {
    q = q.where("manufacturerCountry", "==", filters.manufacturerCountry);
  }

  q = q.orderBy("__name__");
  if (cursorId) {
    const cursorDoc = await collection.doc(cursorId).get();
    if (cursorDoc.exists) q = q.startAfter(cursorDoc);
  }

  /**
   * ORTIQCHA O'QISH. Zaxira so'rovda zaxira/narx filtri BAZADA emas,
   * shu yerda qo'llanadi. Ilgari bazadan aynan `pageSize` ta hujjat
   * olinardi va filtrdan keyin mijozga 24 ta o'rniga 3 ta mahsulot
   * chiqib qolardi (`hasMore` esa filtrlanmagan songa qarab
   * hisoblanardi). Endi ko'proq o'qiladi va sahifa filtrdan KEYIN
   * to'ldiriladi.
   */
  const hasMemoryFilter =
    filters.inStockOnly || filters.minPrice !== undefined || filters.maxPrice !== undefined;
  const rawLimit = hasMemoryFilter ? pageSize * RAW_OVERFETCH : pageSize;

  const matches = (product: Product): boolean => {
    if (filters.inStockOnly && (product.stock ?? 0) <= 0) return false;
    if (filters.minPrice !== undefined && product.price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && product.price > filters.maxPrice) return false;
    return true;
  };

  const snapshot = await q.limit(rawLimit).get();

  const products: Product[] = [];
  let lastConsumed: string | null = null;
  let hasMore = false;

  for (const doc of snapshot.docs) {
    const product = docToProduct(doc);
    const ok = matches(product);
    // Sahifa to'ldi, lekin yana mos mahsulot bor - keyingi sahifa
    // aynan shu hujjatdan davom etadi.
    if (ok && products.length >= pageSize) {
      hasMore = true;
      break;
    }
    lastConsumed = doc.id;
    if (ok) products.push(product);
  }

  // Partiya to'liq tugagan bo'lsa, undan keyin ham hujjat bo'lishi mumkin.
  if (!hasMore && snapshot.docs.length === rawLimit) hasMore = true;

  // Sahifa ichida saralash (butun katalog bo'ylab emas).
  const sorted = [...products].sort((a, b) => {
    switch (filters.sortBy) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "popular":
        return (b.salesCount ?? 0) - (a.salesCount ?? 0);
      default:
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    }
  });

  return { products: sorted, nextCursor: lastConsumed, hasMore };
}

/**
 * Tezkor prefiks + token qidiruvi (mijoz tomondagi `fuzzy.ts` uchun
 * birinchi bosqich). Mantiq avvalgidek: nom boshidan va nomning
 * istalgan so'zi bo'yicha parallel so'rov, natijalar birlashtiriladi.
 */
export async function searchProductsServer(term: string, pageSize = 24): Promise<Product[]> {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];

  const collection = getAdminDb().collection(COLLECTION);

  const prefixQuery = collection
    .where("isActive", "==", true)
    .orderBy("nameSearchIndex")
    .where("nameSearchIndex", ">=", normalized)
    // `\uf8ff` - Unicode'dagi eng yuqori "xususiy" belgi: prefiks
    // oralig'ining yuqori chegarasi.
    .where("nameSearchIndex", "<=", normalized + "\uf8ff")
    .limit(pageSize);

  const tokenTerms = searchTermVariants(normalized);
  const tokenQuery = collection
    .where("isActive", "==", true)
    .where("nameTokens", "array-contains-any", tokenTerms)
    .limit(pageSize);

  const [prefixSnap, tokenSnap] = await Promise.all([
    prefixQuery.get().catch(() => null),
    tokenQuery.get().catch(() => null),
  ]);

  // (isActive + nameTokens) kompozit indeksi hali yaratilmagan bo'lsa
  // yuqoridagi so'rov xato beradi - indekssiz qayta so'raymiz.
  const fallbackSnap =
    tokenSnap === null
      ? await collection
          .where("nameTokens", "array-contains-any", tokenTerms)
          .limit(pageSize)
          .get()
          .catch(() => null)
      : null;

  const seen = new Set<string>();
  const results: Product[] = [];
  for (const doc of [
    ...(prefixSnap?.docs ?? []),
    ...(tokenSnap?.docs ?? []),
    ...(fallbackSnap?.docs ?? []),
  ]) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    const product = docToProduct(doc);
    if (product.isActive === false) continue;
    results.push(product);
  }

  return results.slice(0, pageSize);
}
