import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  onSnapshot,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./client";
import type { Product, ProductFilterParams } from "@/types/product";
import type { Order, OrderStatus } from "@/types/order";

const PRODUCTS_COLLECTION = "products";
const ORDERS_COLLECTION = "orders";

export interface ProductsPage {
  products: Product[];
  lastCursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * 10,000+ mahsulot orasidan sahifalab (cursor-based) yuklaydi.
 * Hech qachon to'liq kolleksiyani bir yo'la o'qimaydi - har doim
 * `limit()` va oldingi sahifaning oxirgi hujjatidan `startAfter()` bilan
 * cheklanadi. Filtrlar Firestore composite indekslari orqali qo'llaniladi
 * (bunday indekslar firestore.indexes.json faylida e'lon qilinishi shart).
 */
export async function getProductsPage(
  filters: ProductFilterParams,
  pageSize = 24,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<ProductsPage> {
  const constraints: QueryConstraint[] = [where("isActive", "==", true)];

  if (filters.category) constraints.push(where("category", "==", filters.category));
  if (filters.brand) constraints.push(where("brand", "==", filters.brand));
  if (filters.material) constraints.push(where("material", "==", filters.material));
  if (filters.manufacturerCountry) {
    constraints.push(where("manufacturerCountry", "==", filters.manufacturerCountry));
  }
  if (filters.inStockOnly) constraints.push(where("stock", ">", 0));
  if (filters.minPrice !== undefined) constraints.push(where("price", ">=", filters.minPrice));
  if (filters.maxPrice !== undefined) constraints.push(where("price", "<=", filters.maxPrice));

  switch (filters.sortBy) {
    case "price-asc":
      constraints.push(orderBy("price", "asc"));
      break;
    case "price-desc":
      constraints.push(orderBy("price", "desc"));
      break;
    default:
      constraints.push(orderBy("createdAt", "desc"));
  }

  constraints.push(limit(pageSize));
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(collection(db, PRODUCTS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  return {
    products: snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Product),
    lastCursor: snapshot.docs.at(-1) ?? null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

/**
 * Tezkor prefiks-qidiruv: `nameSearchIndex` (kichik harfli, indekslangan
 * maydon) bo'yicha Firestore range so'rovi. Bu server tomonidagi birinchi
 * bosqich - natijalar keyin `lib/search/fuzzy.ts` yordamida
 * typo-tolerant tarzda mijoz tomonda qayta saralanadi.
 */
export async function searchProductsByPrefix(term: string, pageSize = 24): Promise<Product[]> {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];

  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where("isActive", "==", true),
    orderBy("nameSearchIndex"),
    where("nameSearchIndex", ">=", normalized),
    where("nameSearchIndex", "<=", normalized + ""),
    limit(pageSize)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
}

/** Mijoz o'z buyurtmasi statusini real-vaqtda kuzatishi uchun. */
export function listenToOrderStatus(
  orderId: string,
  callback: (status: OrderStatus | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, ORDERS_COLLECTION, orderId), (snapshot) => {
    const order = snapshot.data() as Order | undefined;
    callback(order?.status ?? null);
  });
}
