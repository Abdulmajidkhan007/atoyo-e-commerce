import { NextResponse } from "next/server";
import { z } from "zod";
import { validationMessage } from "@/lib/http/validation";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { buildNameTokens, normalizeKeywords } from "@/lib/search/tokens";
import { logAction } from "@/lib/telegram/action-log";
import { registerFacets } from "@/lib/products/facets";
import { normalizeVariants } from "@/lib/products/variants";
import { announceProduct } from "@/lib/telegram/channel";
import { indexProduct } from "@/lib/search/engine";
import { nextProductCode } from "@/lib/products/product-code";
import type { Product } from "@/types/product";
import { formatSom } from "@/lib/format";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(4000).default(""),
  /** Tarjimalar - ixtiyoriy (bo'sh bo'lsa o'zbekchasi ishlatiladi). */
  nameRu: z.string().max(200).optional(),
  nameEn: z.string().max(200).optional(),
  descriptionRu: z.string().max(4000).optional(),
  descriptionEn: z.string().max(4000).optional(),
  /** Do'kon kodi / artikul (ixtiyoriy). */
  sku: z.string().max(60).default(""),
  /**
   * MAXSUS KALIT SO'ZLAR - o'zaro almashtiriladigan mahsulotlarni
   * bog'laydi ("rakovina kalta smesitel" kabi). Ixtiyoriy.
   */
  keywords: z.array(z.string().max(60)).max(10).default([]),
  // Kategoriya/material admin qo'shgan yangi turlar ham bo'lishi mumkin
  // (metadata/taxonomy) - shuning uchun ro'yxat emas, slug tekshiriladi.
  category: z.string().min(1).max(60),
  material: z.string().min(1).max(60),
  /** Sotish turi: dona / metr / kg ... - majburiy. */
  unit: z.string().min(1).max(30),
  brand: z.string().max(120).default(""),
  manufacturerCountry: z.string().max(120).default(""),
  supplier: z.string().max(120).default(""),
  price: z.number().nonnegative(),
  /** Tannarx (bizga tushgan narx) - foyda hisoboti uchun. */
  costPrice: z.number().nonnegative().nullable().default(null),
  discountPrice: z.number().nonnegative().nullable().default(null),
  discountUntil: z.number().int().nullable().default(null),
  stock: z.number().int().nonnegative(),
  diameterMm: z.number().nonnegative().optional(),
  lengthMm: z.number().nonnegative().optional(),
  weightKg: z.number().nonnegative().optional(),
  images: z.array(z.string().url()).max(10).default([]),
  /** Mahsulot videolari (Storage havolalari). */
  videos: z.array(z.string().url()).max(3).default([]),
  /**
   * TURLARI (o'lcham/rang/qalinlik). Berilsa - `price` eng arzon
   * turdan, `stock` esa turlar yig'indisidan hisoblanadi.
   */
  variantAxes: z
    .array(
      z.object({
        key: z.string().min(1).max(40),
        label: z.string().min(1).max(60),
        values: z.array(z.string().min(1).max(60)).max(30),
      })
    )
    .max(3)
    .optional(),
  variants: z
    .array(
      z.object({
        id: z.string().min(1).max(300),
        options: z.record(z.string().max(40), z.string().max(60)),
        price: z.number().nonnegative(),
        costPrice: z.number().nonnegative().nullable().optional(),
        discountPrice: z.number().nonnegative().nullable().optional(),
        stock: z.number().int().nonnegative(),
        sku: z.string().max(60).optional(),
      })
    )
    .max(90)
    .optional(),

  /**
   * CHERNOVIK: "Yangi mahsulot ochish" - mahsulot faqat ta'riflanadi
   * (nom, narx, kategoriya, material, sotish turi, brend, rasm).
   * Katalogga chiqmaydi va kanalga e'lon qilinmaydi - kirim orqali
   * zaxira kelganda nashr bo'ladi.
   */
  isDraft: z.boolean().default(false),
});


/** Yangi mahsulot yaratish (faqat admin). */
export async function POST(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  }

  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  const d = parsed.data;
  const now = Date.now();
  const ref = getAdminDb().collection("products").doc();

  const product: Product = {
    id: ref.id,
    // Odamlar uchun qisqa tartib raqami (1, 2, 3...).
    code: await nextProductCode(),
    slug: `${slugify(d.name, { fallback: "mahsulot" })}-${ref.id.slice(0, 6)}`,
    name: d.name.trim(),
    nameSearchIndex: d.name.trim().toLowerCase(),
    keywords: normalizeKeywords(d.keywords),
    nameTokens: buildNameTokens(d.name, d.brand, d.sku, normalizeKeywords(d.keywords), [
      d.nameRu,
      d.nameEn,
      // Turlarning kodlari ham qidiruvga tushadi ("39302" deb qidirilsa topiladi).
      ...(d.variants ?? []).map((variant) => variant.sku),
    ]),
    description: d.description.trim(),
    nameRu: d.nameRu?.trim() || undefined,
    nameEn: d.nameEn?.trim() || undefined,
    descriptionRu: d.descriptionRu?.trim() || undefined,
    descriptionEn: d.descriptionEn?.trim() || undefined,
    sku: d.sku.trim(),
    category: d.category,
    brand: d.brand.trim(),
    manufacturerCountry: d.manufacturerCountry.trim(),
    supplier: d.supplier.trim(),
    material: d.material,
    unit: d.unit,
    // Turlar qatorlarga qarab tozalanadi (mos kelmagan turlar tushmaydi).
    ...normalizeVariants(d.variantAxes ?? [], d.variants ?? []),
    dimensions: {
      ...(d.diameterMm !== undefined ? { diameterMm: d.diameterMm } : {}),
      ...(d.lengthMm !== undefined ? { lengthMm: d.lengthMm } : {}),
      ...(d.weightKg !== undefined ? { weightKg: d.weightKg } : {}),
    },
    price: d.price,
    costPrice: d.costPrice,
    discountPrice: d.discountPrice,
    discountUntil: d.discountUntil,
    currency: "UZS",
    stock: d.stock,
    images: d.images,
    videos: d.videos,
    thumbnailUrl: d.images[0] ?? "",
    isActive: !d.isDraft,
    isDraft: d.isDraft,
    salesCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(product);
  // Tashqi qidiruv motori (sozlangan bo'lsa) - best-effort.
  await indexProduct(product);
  await registerFacets({ brand: product.brand, country: product.manufacturerCountry, supplier: product.supplier });
  // Chernovik e'lon qilinmaydi (announceProduct ham uni o'tkazib yuboradi).
  await announceProduct(product, "new");
  await logAction(
    d.isDraft
      ? `📝 Yangi mahsulot ochildi (${admin.email ?? "admin"}): №${product.code} — ${product.name} (chernovik, kirim kutilmoqda)`
      : `📦 Yangi mahsulot (${admin.email ?? "admin"}): №${product.code} — ${product.name}, ${formatSom(product.price)}, ${product.stock} dona`
  );
  return NextResponse.json({ product }, { status: 201 });
}
