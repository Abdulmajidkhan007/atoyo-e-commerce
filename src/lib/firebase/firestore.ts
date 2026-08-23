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
import type { Product, ProductFilterParams } from "@/types/product";
import type { Order, OrderStatus } from "@/types/order";

const ORDERS_COLLECTION = "orders";

export interface ProductsPage {
  products: Product[];
  /**
   * Keyingi sahifa kursori. Ilgari bu Firestore hujjat snapshot'i edi;
   * endi so'rov server orqali ketgani uchun oddiy satr - oxirgi
   * hujjatning ID si.
   */
  lastCursor: string | null;
  hasMore: boolean;
}

/**
 * MAHSULOTLAR SERVER ORQALI O'QILADI.
 *
 * Avval bu funksiya Firestore'ga to'g'ridan-to'g'ri borardi. Lekin
 * mahsulot hujjatida OPTOM narx (`price`) va TANNARX (`costPrice`)
 * turadi - ular ochiq o'qilsa raqobatchi ham ko'raverardi. Endi
 * `products` kolleksiyasi qoidalarda YOPIQ, o'qish esa
 * `/api/products/list` orqali: filtr va saralash avvalgidek BAZA
 * TOMONIDA qoladi, javobdagi narx esa rolga moslab beriladi
 * (`lib/products/viewer.ts`).
 */
export async function getProductsPage(
  filters: ProductFilterParams,
  pageSize = 24,
  cursor: string | null = null,
  /**
   * ADMIN PANEL uchun: OPTOM narx va tannarx bilan. Server buni
   * faqat xodimga beradi, mijoz so'rasa e'tiborsiz qoladi.
   * Vitrinada (katalog, qidiruv) ISHLATILMAYDI.
   */
  raw = false
): Promise<ProductsPage> {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.material) params.set("material", filters.material);
  if (filters.manufacturerCountry) {
    params.set("manufacturerCountry", filters.manufacturerCountry);
  }
  if (filters.inStockOnly) params.set("inStockOnly", "1");
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  params.set("pageSize", String(pageSize));
  if (cursor) params.set("cursor", cursor);
  if (raw) params.set("raw", "1");

  const res = await fetch(`/api/products/list?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Katalog o'qilmadi.");

  const data = (await res.json()) as {
    products?: Product[];
    nextCursor?: string | null;
    hasMore?: boolean;
  };

  return {
    products: data.products ?? [],
    lastCursor: data.nextCursor ?? null,
    hasMore: Boolean(data.hasMore),
  };
}

/**
 * Qidiruvning birinchi bosqichi. Baza tomonida `nameSearchIndex`
 * prefiksi va `nameTokens` so'zlari bo'yicha qidiriladi
 * (`lib/products/catalog-server.ts`), natijalar keyin mijoz tomonda
 * `lib/search/fuzzy.ts` bilan xatoga chidamli tarzda saralanadi.
 */
export async function searchProductsByPrefix(
  term: string,
  pageSize = 24,
  /** ADMIN PANEL uchun - optom narx bilan (yuqoriga qarang). */
  raw = false
): Promise<Product[]> {
  const normalized = term.trim();
  if (!normalized) return [];

  const params = new URLSearchParams({ q: normalized, pageSize: String(pageSize) });
  if (raw) params.set("raw", "1");
  const res = await fetch(`/api/products/search?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) return [];

  const data = (await res.json()) as { products?: Product[] };
  return data.products ?? [];
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
