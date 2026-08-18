import { NextResponse } from "next/server";
import { z } from "zod";
import { validationMessage } from "@/lib/http/validation";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { buildNameTokens, normalizeKeywords } from "@/lib/search/tokens";
import { registerFacets } from "@/lib/products/facets";
import { normalizeVariants } from "@/lib/products/variants";
import { announceProduct, announceModeFor } from "@/lib/telegram/channel";
import { indexProduct, removeFromIndex } from "@/lib/search/engine";
import { moveToTrash } from "@/lib/products/trash";
import type { Product } from "@/types/product";

export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).optional(),
  nameRu: z.string().max(200).optional(),
  nameEn: z.string().max(200).optional(),
  descriptionRu: z.string().max(4000).optional(),
  descriptionEn: z.string().max(4000).optional(),
  sku: z.string().max(60).optional(),
  keywords: z.array(z.string().max(60)).max(10).optional(),
  // Admin qo'shgan yangi turlar ham bo'lishi mumkin (metadata/taxonomy).
  category: z.string().min(1).max(60).optional(),
  // Material majburiy emas - bo'sh matn ham qabul qilinadi.
  material: z.string().max(60).optional(),
  /** Sotish turi: dona / metr / kg ... */
  unit: z.string().min(1).max(30).optional(),
  brand: z.string().max(120).optional(),
  manufacturerCountry: z.string().max(120).optional(),
  supplier: z.string().max(120).optional(),
  price: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().nullable().optional(),
  discountPrice: z.number().nonnegative().nullable().optional(),
  discountUntil: z.number().int().nullable().optional(),
  stock: z.number().int().nonnegative().optional(),
  diameterMm: z.number().nonnegative().nullable().optional(),
  lengthMm: z.number().nonnegative().nullable().optional(),
  weightKg: z.number().nonnegative().nullable().optional(),
  images: z.array(z.string().url()).max(10).optional(),
  videos: z.array(z.string().url()).max(3).optional(),
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
  /** Haqiqatda mavjud bo'lmagan kombinatsiyalar (o'chirilganlari). */
  variantsExcluded: z.array(z.string().max(300)).max(90).optional(),
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

  /** O'rnatib berish xizmati bor mahsulot (moyka, dush kabina...). */
  installService: z.boolean().optional(),
  isActive: z.boolean().optional(),
  /** `false` - chernovikni nashr qilish (katalogga chiqadi + kanalga e'lon). */
  isDraft: z.boolean().optional(),
});

/** Mahsulotni tahrirlash (faqat admin). Faqat berilgan maydonlar yangilanadi. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("products", request);
  if (!admin) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  const { id } = await params;
  const ref = getAdminDb().collection("products").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return NextResponse.json({ error: "Mahsulot topilmadi." }, { status: 404 });
  }

  const d = parsed.data;
  const existing = snapshot.data() as Product;
  const updates: Record<string, unknown> = { updatedAt: Date.now() };

  if (d.keywords !== undefined) updates.keywords = normalizeKeywords(d.keywords);
  if (
    d.name !== undefined ||
    d.sku !== undefined ||
    d.brand !== undefined ||
    d.keywords !== undefined ||
    d.nameRu !== undefined ||
    d.nameEn !== undefined ||
    d.variants !== undefined
  ) {
    // Tokenlar nom + brend + KOD dan yasaladi. Ilgari bu yerda kod
    // berilmasdi va mahsulot tahrirlanganda "8276" kabi kod bo'yicha
    // qidiruv ishlamay qolardi.
    const name = d.name ?? existing.name;
    updates.name = name.trim();
    updates.nameSearchIndex = name.trim().toLowerCase();
    updates.nameTokens = buildNameTokens(
      name,
      d.brand ?? existing.brand,
      d.sku ?? existing.sku,
      normalizeKeywords(d.keywords ?? existing.keywords),
      // Tarjimalar va turlarning kodlari ham indeksga tushadi -
      // ruscha qidiruv va "39302" kabi kod bo'yicha qidiruv uchun.
      [
        d.nameRu ?? existing.nameRu,
        d.nameEn ?? existing.nameEn,
        ...((d.variants ?? existing.variants) ?? []).map((variant) => variant.sku),
      ]
    );
  }
  if (d.description !== undefined) updates.description = d.description.trim();
  if (d.nameRu !== undefined) updates.nameRu = d.nameRu.trim() || undefined;
  if (d.nameEn !== undefined) updates.nameEn = d.nameEn.trim() || undefined;
  if (d.descriptionRu !== undefined) updates.descriptionRu = d.descriptionRu.trim() || undefined;
  if (d.descriptionEn !== undefined) updates.descriptionEn = d.descriptionEn.trim() || undefined;
  if (d.category !== undefined) updates.category = d.category;
  if (d.material !== undefined) updates.material = d.material;
  if (d.unit !== undefined) updates.unit = d.unit;
  if (d.sku !== undefined) updates.sku = d.sku.trim();
  if (d.brand !== undefined) updates.brand = d.brand.trim();
  if (d.manufacturerCountry !== undefined) updates.manufacturerCountry = d.manufacturerCountry.trim();
  if (d.supplier !== undefined) updates.supplier = d.supplier.trim();
  if (d.price !== undefined) updates.price = d.price;
  if (d.costPrice !== undefined) updates.costPrice = d.costPrice;
  if (d.discountPrice !== undefined) updates.discountPrice = d.discountPrice;
  if (d.discountUntil !== undefined) updates.discountUntil = d.discountUntil;
  if (d.stock !== undefined) updates.stock = d.stock;
  if (d.variantAxes !== undefined || d.variants !== undefined) {
    const clean = normalizeVariants(
      d.variantAxes ?? existing.variantAxes ?? [],
      d.variants ?? existing.variants ?? [],
      d.variantsExcluded ?? existing.variantsExcluded ?? []
    );
    updates.variantAxes = clean.axes;
    updates.variants = clean.variants;
    // "Bunday turi yo'q" deb belgilanganlar qayta yasalmasin.
    updates.variantsExcluded = clean.variantsExcluded;
  }
  if (d.isActive !== undefined) updates.isActive = d.isActive;
  if (d.isDraft !== undefined) {
    updates.isDraft = d.isDraft;
    // Chernovik nashr qilinganda katalogda ham ko'rinishi kerak.
    if (!d.isDraft && d.isActive === undefined) updates.isActive = true;
  }
  if (d.videos !== undefined) updates.videos = d.videos;
  if (d.installService !== undefined) updates.installService = d.installService;
  if (d.images !== undefined) {
    updates.images = d.images;
    updates.thumbnailUrl = d.images[0] ?? "";
  }

  // Dimensions maydonlari - nested update.
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
  await indexProduct(updated);
  // Kanaldagi post har doim yangi holat bilan yangilanadi, lekin
  // "♻️ Mahsulot yangilandi" sarlavhasi faqat narx/chegirma o'zgarganda
  // yoki tugagan mahsulot qayta kelganda chiqadi. Chernovik nashr
  // qilinganda esa - "🆕 Yangi mahsulot!".
  const mode = existing.isDraft && !updated.isDraft ? "new" : announceModeFor(existing, updated);
  await announceProduct(updated, mode);
  return NextResponse.json({ product: updated });
}

/** Mahsulotni butunlay o'chirish (faqat admin). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("products", request);
  if (!admin) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  }

  const { id } = await params;
  // Savatga ko'chiriladi (30 kun) - butunlay o'chirish savatdan.
  const moved = await moveToTrash([id], admin.email ?? admin.displayName ?? "admin");
  if (moved === 0) {
    // Hujjat topilmadi - eski xatti-harakat (indeksdan tozalash) qoladi.
    await removeFromIndex(id);
  }
  return NextResponse.json({ ok: true, trashed: moved > 0 });
}
