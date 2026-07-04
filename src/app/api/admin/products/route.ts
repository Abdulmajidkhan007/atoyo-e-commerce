import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminUser } from "@/lib/firebase/session";
import type { Product } from "@/types/product";

export const runtime = "nodejs";

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(4000).default(""),
  category: z.enum([
    "pipes",
    "fittings",
    "faucets",
    "shower-systems",
    "boilers",
    "radiators",
    "pumps",
    "sanitary-ware",
  ]),
  material: z.enum(["polypropylene", "metal-plastic", "steel", "copper", "brass", "cast-iron", "pvc"]),
  brand: z.string().max(120).default(""),
  manufacturerCountry: z.string().max(120).default(""),
  price: z.number().nonnegative(),
  discountPrice: z.number().nonnegative().nullable().default(null),
  stock: z.number().int().nonnegative(),
  diameterMm: z.number().nonnegative().optional(),
  lengthMm: z.number().nonnegative().optional(),
  weightKg: z.number().nonnegative().optional(),
  images: z.array(z.string().url()).max(10).default([]),
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
  const admin = await requireAdminUser();
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
    description: d.description.trim(),
    category: d.category,
    brand: d.brand.trim(),
    manufacturerCountry: d.manufacturerCountry.trim(),
    material: d.material,
    dimensions: {
      ...(d.diameterMm !== undefined ? { diameterMm: d.diameterMm } : {}),
      ...(d.lengthMm !== undefined ? { lengthMm: d.lengthMm } : {}),
      ...(d.weightKg !== undefined ? { weightKg: d.weightKg } : {}),
    },
    price: d.price,
    discountPrice: d.discountPrice,
    currency: "UZS",
    stock: d.stock,
    images: d.images,
    thumbnailUrl: d.images[0] ?? "",
    isActive: true,
    salesCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(product);
  return NextResponse.json({ product }, { status: 201 });
}
