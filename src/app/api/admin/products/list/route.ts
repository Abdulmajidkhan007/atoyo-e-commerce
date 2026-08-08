import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import type { Product } from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ADMIN RO'YXATI (katalogni tartibga solish sahifasi uchun).
 *
 * Katta import (masalan 1C narxnomasi) qilingandan keyin xatolarni
 * topish kerak: kategoriyasi noto'g'ri tushganlar, rasmsizlar,
 * keraksizlar. Bu yo'l shu ish uchun: BITTA tenglik filtri bilan
 * (kategoriya YOKI brend) sahifalab beradi, qolgan saralashni
 * (qidiruv, rasmsizlar, zaxira) sahifaning o'zi qiladi.
 *
 * Bitta tenglik + hujjat ID tartibi - kompozit indeks kerak emas,
 * shuning uchun yangi indeks deploy qilmasdan ishlaydi.
 */
const PAGE_SIZE = 300;

export interface AdminListProduct {
  id: string;
  name: string;
  code: number | null;
  sku: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  unit: string;
  isActive: boolean;
  isDraft: boolean;
  thumbnailUrl: string;
  imageCount: number;
  /** Videosi bormi - YouTube (Shorts) ga faqat shundaylari ketadi. */
  hasVideo: boolean;
  /** Kanalga e'lon qilinganmi (post ID si bor-yo'qligi). */
  posted: boolean;
}

export async function GET(request: Request) {
  const admin = await requirePermission("products", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const url = new URL(request.url);
  const category = url.searchParams.get("category")?.trim();
  const brand = url.searchParams.get("brand")?.trim();
  const after = url.searchParams.get("after");
  const limit = Math.min(Number(url.searchParams.get("limit")) || PAGE_SIZE, 500);

  const db = getAdminDb();

  // Qidiruv - kategoriya/brend filtri kabi ishlaydi, lekin sahifalanmaydi
  // (topilganlar bir yo'la keladi va hammasi ommaviy amalga tayyor).
  const term = url.searchParams.get("q")?.trim();
  if (term) {
    return NextResponse.json({
      products: await searchProducts(db, term, limit),
      nextCursor: null,
    });
  }

  let query: FirebaseFirestore.Query = db.collection("products");
  if (category) query = query.where("category", "==", category);
  else if (brand) query = query.where("brand", "==", brand);

  query = query
    .select(
      "name",
      "code",
      "sku",
      "category",
      "brand",
      "price",
      "stock",
      "unit",
      "isActive",
      "isDraft",
      "thumbnailUrl",
      "images",
      "videos",
      "channelMessageId"
    )
    .orderBy("__name__")
    .limit(limit);

  if (after) query = query.startAfter(db.collection("products").doc(after));

  const snapshot = await query.get();
  const products = snapshot.docs.map(toListProduct);

  return NextResponse.json({
    products,
    nextCursor: snapshot.docs.length === limit ? (snapshot.docs.at(-1)?.id ?? null) : null,
  });
}

/** Firestore hujjatidan ro'yxat qatori. */
function toListProduct(doc: FirebaseFirestore.QueryDocumentSnapshot): AdminListProduct {
  const data = doc.data() as Partial<Product>;
  return {
    id: doc.id,
    name: data.name ?? "",
    code: data.code ?? null,
    sku: data.sku ?? "",
    category: data.category ?? "",
    brand: data.brand ?? "",
    price: data.price ?? 0,
    stock: data.stock ?? 0,
    unit: data.unit ?? "dona",
    isActive: data.isActive !== false,
    isDraft: data.isDraft === true,
    thumbnailUrl: data.thumbnailUrl ?? "",
    imageCount: (data.images ?? []).length,
    hasVideo: (data.videos ?? []).length > 0,
    posted: Boolean(data.channelMessageId),
  };
}

/**
 * NOM / KOD / ARTIKUL BO'YICHA QIDIRUV (admin uchun).
 *
 * Kategoriya va brend filtri kabi, natija AYNAN SHU ro'yxat
 * shaklida qaytadi - shuning uchun topilganlarga ham ommaviy
 * amallar (o'chirish, saytda ochish, kanalga e'lon, kategoriya
 * almashtirish) o'zgarishsiz ishlaydi.
 *
 * Chernoviklar ham topiladi (`isActive` filtri yo'q) - admin
 * ro'yxatida ular ham ko'rinishi kerak.
 */
async function searchProducts(
  db: FirebaseFirestore.Firestore,
  term: string,
  limit: number
): Promise<AdminListProduct[]> {
  const normalized = term.trim().toLowerCase();
  if (normalized.length < 2) return [];

  const words = Array.from(new Set(normalized.split(/\s+/).filter((word) => word.length >= 2)))
    .slice(0, 10);
  const tokens = words.length > 0 ? words : [normalized];
  const collection = db.collection("products");

  const [byPrefix, byToken, byCode, bySku] = await Promise.all([
    collection
      .orderBy("nameSearchIndex")
      .startAt(normalized)
      // `\uf8ff` - shu prefiksdagi eng oxirgi qiymat.
      .endAt(`${normalized}\uf8ff`)
      .limit(limit)
      .get()
      .catch(() => null),
    collection
      .where("nameTokens", "array-contains-any", tokens)
      .limit(limit)
      .get()
      .catch(() => null),
    /^\d+$/.test(normalized)
      ? collection.where("code", "==", Number(normalized)).limit(5).get().catch(() => null)
      : Promise.resolve(null),
    collection.where("sku", "==", term.trim()).limit(5).get().catch(() => null),
  ]);

  const seen = new Set<string>();
  const rows: AdminListProduct[] = [];
  for (const snap of [byCode, bySku, byPrefix, byToken]) {
    for (const doc of snap?.docs ?? []) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      rows.push(toListProduct(doc));
      if (rows.length >= limit) return rows;
    }
  }
  return rows;
}
