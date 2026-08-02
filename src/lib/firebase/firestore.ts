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
import { getFirebaseDb } from "./client";
import { searchTermVariants } from "@/lib/search/tokens";
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
    case "popular":
      constraints.push(orderBy("salesCount", "desc"));
      break;
    default:
      constraints.push(orderBy("createdAt", "desc"));
  }

  constraints.push(limit(pageSize));
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(collection(getFirebaseDb(), PRODUCTS_COLLECTION), ...constraints);
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
    collection(getFirebaseDb(), PRODUCTS_COLLECTION),
    where("isActive", "==", true),
    orderBy("nameSearchIndex"),
    where("nameSearchIndex", ">=", normalized),
    where("nameSearchIndex", "<=", normalized + ""),
    limit(pageSize)
  );

  // Prefiks (nom boshidan) va token (nomning istalgan so'zi) qidiruvlari
  // parallel yuboriladi, natijalar birlashtiriladi.
  //
  // Token so'rovi HAR BIR so'z bo'yicha ishlaydi (`array-contains-any`):
  // "8276 dush" deb qidirilsa ham, "dush 8276" deb qidirilsa ham
  // "Boou dush 8276" topiladi. So'zlarning hammasi mos kelishi (AND)
  // keyin mijoz tomonda tekshiriladi (lib/search/fuzzy.ts).
  // So'zlar asl va "tekislangan" (kirill->lotin, apostrofsiz) ko'rinishda
  // yuboriladi - "душ" deb qidirgan odam "Dush" ni ham topadi.
  const tokenTerms = searchTermVariants(normalized);
  const tokenQuery = query(
    collection(getFirebaseDb(), PRODUCTS_COLLECTION),
    where("isActive", "==", true),
    where("nameTokens", "array-contains-any", tokenTerms),
    limit(pageSize)
  );

  const [prefixSnap, tokenSnap] = await Promise.all([
    getDocs(q).catch(() => null),
    getDocs(tokenQuery).catch(() => null),
  ]);

  // Kompozit indeks (isActive + nameTokens) hali yaratilmagan bo'lsa
  // yuqoridagi so'rov xato beradi - o'shanda indekssiz (faqat nameTokens
  // bo'yicha) qayta so'raymiz va isActive ni mijoz tomonda filtrlaymiz.
  const fallbackSnap =
    tokenSnap === null
      ? await getDocs(
          query(
            collection(getFirebaseDb(), PRODUCTS_COLLECTION),
            where("nameTokens", "array-contains-any", tokenTerms),
            limit(pageSize)
          )
        ).catch(() => null)
      : null;

  const seen = new Set<string>();
  const results: Product[] = [];
  for (const d of [...(prefixSnap?.docs ?? []), ...(tokenSnap?.docs ?? []), ...(fallbackSnap?.docs ?? [])]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    const product = { id: d.id, ...d.data() } as Product;
    if (product.isActive === false) continue;
    results.push(product);
  }
  return results.slice(0, pageSize);
}

/** Mijoz o'z buyurtmasi statusini real-vaqtda kuzatishi uchun. */
export function listenToOrderStatus(
  orderId: string,
  callback: (status: OrderStatus | null) => void
): Unsubscribe {
  return onSnapshot(doc(getFirebaseDb(), ORDERS_COLLECTION, orderId), (snapshot) => {
    const order = snapshot.data() as Order | undefined;
    callback(order?.status ?? null);
  });
}

/**
 * Profil sahifasida foydalanuvchining so'nggi buyurtmalarini real-vaqtda
 * ko'rsatadi - admin Telegram tugmasidan statusni o'zgartirganda, mijoz
 * sahifani yangilamasdan turib yangi statusni ko'radi (onSnapshot).
 */
export function subscribeToUserOrders(
  userId: string,
  callback: (orders: Order[]) => void,
  pageSize = 20
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), ORDERS_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Order));
    },
    () => {
      // Kompozit indeks (userId + createdAt) hali yaratilmagan bo'lsa,
      // onSnapshot xato beradi va ILGARI jimgina bo'sh ro'yxat qolardi
      // ("Buyurtmalaringiz yo'q"). Fallback: saralashsiz so'rab, mijoz
      // tomonda tartiblaymiz (bunga indeks kerak emas).
      const fallback = query(
        collection(getFirebaseDb(), ORDERS_COLLECTION),
        where("userId", "==", userId),
        limit(pageSize)
      );
      getDocs(fallback)
        .then((snap) => {
          callback(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }) as Order)
              .sort((a, b) => b.createdAt - a.createdAt)
          );
        })
        .catch(() => callback([]));
    }
  );
}

export interface OrdersPage {
  orders: Order[];
  lastCursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Admin paneli uchun barcha buyurtmalarni (ixtiyoriy status filtri
 * bilan) sahifalab o'qiydi. To'g'ridan-to'g'ri klient SDK orqali
 * ishlaydi - `firestore.rules`dagi `isAdmin()` qoidasi buni faqat
 * `role: 'admin'` bo'lgan foydalanuvchiga ruxsat beradi.
 */
export async function getOrdersPage(
  status: OrderStatus | undefined,
  pageSize = 20,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null,
  dateRange?: { from?: number; to?: number }
): Promise<OrdersPage> {
  const constraints: QueryConstraint[] = [];
  if (status) constraints.push(where("status", "==", status));
  // Sana oralig'i createdAt bo'yicha range - mavjud (status+createdAt)
  // kompozit indeks bilan ishlaydi, yangi indeks talab qilmaydi.
  if (dateRange?.from) constraints.push(where("createdAt", ">=", dateRange.from));
  if (dateRange?.to) constraints.push(where("createdAt", "<=", dateRange.to));
  constraints.push(orderBy("createdAt", "desc"));
  constraints.push(limit(pageSize));
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(collection(getFirebaseDb(), ORDERS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  return {
    orders: snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Order),
    lastCursor: snapshot.docs.at(-1) ?? null,
    hasMore: snapshot.docs.length === pageSize,
  };
}
