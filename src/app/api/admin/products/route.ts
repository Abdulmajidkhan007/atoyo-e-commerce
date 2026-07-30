import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { buildNameTokens } from "@/lib/search/tokens";
import { logAction } from "@/lib/telegram/action-log";
import { registerFacets } from "@/lib/products/facets";
import { announceProduct } from "@/lib/telegram/channel";
import type { Product } from "@/types/product";

export const runtime = "nodejs";

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(4000).default(""),
  /** Do'kon kodi / artikul (ixtiyoriy). */
  sku: z.string().max(60).default(""),
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
  discountPrice: z.number().nonnegative().nullable().default(null),
  discountUntil: z.number().int().nullable().default(null),
  stock: z.number().int().nonnegative(),
  diameterMm: z.number().nonnegative().optional(),
  lengthMm: z.number().nonnegative().optional(),
  weightKg: z.number().nonnegative().optional(),
  images: z.array(z.string().url()).max(10).default([]),
  /**
   * CHERNOVIK: "Yangi mahsulot ochish" - mahsulot faqat ta'riflanadi
   * (nom, narx, kategoriya, material, sotish turi, brend, rasm).
   * Katalogga chiqmaydi va kanalga e'lon qilinmaydi - kirim orqali
   * zaxira kelganda nashr bo'ladi.
   */
  isDraft: z.boolean().default(false),
});

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-") || "mahsulot"
  );
}

/** Yangi mahsulot yaratish (faqat admin). */
export async function POST(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  }

  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Mahsulot ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const d = parsed.data;
  const now = Date.now();
  const ref = getAdminDb().collection("products").doc();

  const product: Product = {
    id: ref.id,
    slug: `${slugify(d.name)}-${ref.id.slice(0, 6)}`,
    name: d.name.trim(),
    nameSearchIndex: d.name.trim().toLowerCase(),
    nameTokens: buildNameTokens(d.name, d.brand, d.sku),
    description: d.description.trim(),
    sku: d.sku.trim(),
    category: d.category,
    brand: d.brand.trim(),
    manufacturerCountry: d.manufacturerCountry.trim(),
    supplier: d.supplier.trim(),
    material: d.material,
    unit: d.unit,
    dimensions: {
      ...(d.diameterMm !== undefined ? { diameterMm: d.diameterMm } : {}),
      ...(d.lengthMm !== undefined ? { lengthMm: d.lengthMm } : {}),
      ...(d.weightKg !== undefined ? { weightKg: d.weightKg } : {}),
    },
    price: d.price,
    discountPrice: d.discountPrice,
    discountUntil: d.discountUntil,
    currency: "UZS",
    stock: d.stock,
    images: d.images,
    thumbnailUrl: d.images[0] ?? "",
    isActive: !d.isDraft,
    isDraft: d.isDraft,
    salesCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(product);
  await registerFacets({ brand: product.brand, country: product.manufacturerCountry, supplier: product.supplier });
  // Chernovik e'lon qilinmaydi (announceProduct ham uni o'tkazib yuboradi).
  await announceProduct(product, "new");
  await logAction(
    d.isDraft
      ? `📝 Yangi mahsulot ochildi (${admin.email ?? "admin"}): ${product.name} — chernovik, kirim kutilmoqda`
      : `📦 Yangi mahsulot (${admin.email ?? "admin"}): ${product.name} — ${product.price.toLocaleString("uz-UZ")} so'm, ${product.stock} dona`
  );
  return NextResponse.json({ product }, { status: 201 });
}
