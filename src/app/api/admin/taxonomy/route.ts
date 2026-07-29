import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { BUILTIN_CATEGORIES, BUILTIN_MATERIALS, BUILTIN_UNITS, slugify, type TaxonomyItem, type TaxonomyKind } from "@/lib/products/taxonomy";

export const runtime = "nodejs";

/**
 * KATEGORIYA / MATERIAL / SOTISH TURI ro'yxatlarini boshqarish.
 *
 * Standart turlar kodda (o'chirib bo'lmaydi), admin qo'shganlari
 * `metadata/taxonomy` hujjatida. Mahsulotlar bu qiymatlarni slug
 * sifatida saqlaydi, shuning uchun ishlatilayotgan turni o'chirish
 * mumkin emas - avval mahsulotlarni boshqa turga o'tkazish kerak.
 */

const KINDS: TaxonomyKind[] = ["categories", "materials", "units"];

const addSchema = z.object({
  kind: z.enum(["categories", "materials", "units"]),
  label: z.string().min(2).max(60),
});

const deleteSchema = z.object({
  kind: z.enum(["categories", "materials", "units"]),
  slug: z.string().min(1).max(60),
});

const BUILTIN: Record<TaxonomyKind, TaxonomyItem[]> = {
  categories: BUILTIN_CATEGORIES,
  materials: BUILTIN_MATERIALS,
  units: BUILTIN_UNITS,
};

export async function GET() {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const taxonomy = await getTaxonomy();
  return NextResponse.json({
    taxonomy,
    // Qaysilari standart (o'chirilmaydi) - UI shu bo'yicha ko'rsatadi.
    builtinSlugs: Object.fromEntries(
      KINDS.map((kind) => [kind, BUILTIN[kind].map((item) => item.slug)])
    ),
  });
}

/** Yangi tur qo'shish. */
export async function POST(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const label = parsed.data.label.trim();
  const slug = slugify(label);
  const taxonomy = await getTaxonomy();

  if (taxonomy[parsed.data.kind].some((item) => item.slug === slug)) {
    return NextResponse.json({ error: "Bunday tur allaqachon bor." }, { status: 409 });
  }

  await getAdminDb()
    .doc("metadata/taxonomy")
    .set({ [parsed.data.kind]: FieldValue.arrayUnion({ slug, label }) }, { merge: true });

  await logAction(`🏷 Yangi tur qo'shildi (${admin.email ?? "admin"}): ${label}`);
  return NextResponse.json({ ok: true, item: { slug, label } });
}

/** Admin qo'shgan turni o'chirish (standartlar o'chirilmaydi). */
export async function DELETE(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const { kind, slug } = parsed.data;
  if (BUILTIN[kind].some((item) => item.slug === slug)) {
    return NextResponse.json({ error: "Standart turni o'chirib bo'lmaydi." }, { status: 400 });
  }

  // Ishlatilayotgan turni o'chirish mahsulotlarni "nomsiz" qoldiradi.
  const field = kind === "categories" ? "category" : kind === "materials" ? "material" : "unit";
  const used = await getAdminDb().collection("products").where(field, "==", slug).limit(1).get();
  if (!used.empty) {
    return NextResponse.json(
      { error: "Bu tur mahsulotlarda ishlatilyapti. Avval ularni boshqa turga o'tkazing." },
      { status: 409 }
    );
  }

  const snap = await getAdminDb().doc("metadata/taxonomy").get();
  const current = ((snap.data() ?? {})[kind] ?? []) as TaxonomyItem[];
  await getAdminDb()
    .doc("metadata/taxonomy")
    .set({ [kind]: current.filter((item) => item.slug !== slug) }, { merge: true });

  return NextResponse.json({ ok: true });
}
