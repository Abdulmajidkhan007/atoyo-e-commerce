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
  const products: AdminListProduct[] = snapshot.docs.map((doc) => {
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
  });

  return NextResponse.json({
    products,
    nextCursor: snapshot.docs.length === limit ? (snapshot.docs.at(-1)?.id ?? null) : null,
  });
}
