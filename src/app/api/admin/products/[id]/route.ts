import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { buildNameTokens } from "@/lib/search/tokens";
import { registerFacets } from "@/lib/products/facets";
import { announceProduct } from "@/lib/telegram/channel";
import type { Product } from "@/types/product";

export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).optional(),
  // Admin qo'shgan yangi turlar ham bo'lishi mumkin (metadata/taxonomy).
  category: z.string().min(1).max(60).optional(),
  material: z.string().min(1).max(60).optional(),
  /** Sotish turi: dona / metr / kg ... */
  unit: z.string().min(1).max(30).optional(),
  brand: z.string().max(120).optional(),
  manufacturerCountry: z.string().max(120).optional(),
  supplier: z.string().max(120).optional(),
  price: z.number().nonnegative().optional(),
  discountPrice: z.number().nonnegative().nullable().optional(),
  discountUntil: z.number().int().nullable().optional(),
  stock: z.number().int().nonnegative().optional(),
  diameterMm: z.number().nonnegative().nullable().optional(),
  lengthMm: z.number().nonnegative().nullable().optional(),
  weightKg: z.number().nonnegative().nullable().optional(),
  images: z.array(z.string().url()).max(10).optional(),
  isActive: z.boolean().optional(),
});

/** Mahsulotni tahrirlash (faqat admin). Faqat berilgan maydonlar yangilanadi. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("products");
  if (!admin) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });
  }

  const { id } = await params;
  const ref = getAdminDb().collection("products").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return NextResponse.json({ error: "Mahsulot topilmadi." }, { status: 404 });
  }

  const d = parsed.data;
  const updates: Record<string, unknown> = { updatedAt: Date.now() };

  if (d.name !== undefined) {
    updates.name = d.name.trim();
    updates.nameSearchIndex = d.name.trim().toLowerCase();
    updates.nameTokens = buildNameTokens(d.name, d.brand);
  }
  if (d.description !== undefined) updates.description = d.description.trim();
  if (d.category !== undefined) updates.category = d.category;
  if (d.material !== undefined) updates.material = d.material;
  if (d.unit !== undefined) updates.unit = d.unit;
  if (d.brand !== undefined) updates.brand = d.brand.trim();
  if (d.manufacturerCountry !== undefined) updates.manufacturerCountry = d.manufacturerCountry.trim();
  if (d.supplier !== undefined) updates.supplier = d.supplier.trim();
  if (d.price !== undefined) updates.price = d.price;
  if (d.discountPrice !== undefined) updates.discountPrice = d.discountPrice;
  if (d.discountUntil !== undefined) updates.discountUntil = d.discountUntil;
  if (d.stock !== undefined) updates.stock = d.stock;
  if (d.isActive !== undefined) updates.isActive = d.isActive;
  if (d.images !== undefined) {
    updates.images = d.images;
    updates.thumbnailUrl = d.images[0] ?? "";
  }

  // Dimensions maydonlari - nested update.
  const existing = snapshot.data() as Product;
  if (d.diameterMm !== undefined || d.lengthMm !== undefined || d.weightKg !== undefined) {
    updates.dimensions = {
      ...existing.dimensions,
      ...(d.diameterMm !== undefined ? { diameterMm: d.diameterMm ?? undefined } : {}),
      ...(d.lengthMm !== undefined ? { lengthMm: d.lengthMm ?? undefined } : {}),
      ...(d.weightKg !== undefined ? { weightKg: d.weightKg ?? undefined } : {}),
    };
  }

  await ref.update(updates);
  await registerFacets({ brand: d.brand, country: d.manufacturerCountry, supplier: d.supplier });
  const updated = { ...existing, ...updates, id } as Product;
  // Tahrirlangan mahsulot ham kanalga yangi holati bilan chiqadi.
  await announceProduct(updated, "updated");
  return NextResponse.json({ product: updated });
}

/** Mahsulotni butunlay o'chirish (faqat admin). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("products");
  if (!admin) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  }

  const { id } = await params;
  await getAdminDb().collection("products").doc(id).delete();
  return NextResponse.json({ ok: true });
}
