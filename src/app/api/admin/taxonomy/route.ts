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

const renameSchema = z.object({
  kind: z.enum(["categories", "materials", "units"]),
  slug: z.string().min(1).max(60),
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

/**
 * Tur nomini tahrirlash. Slug o'zgarmaydi (mahsulotlarda o'sha slug
 * saqlangan), faqat ko'rinadigan nom yangilanadi - shuning uchun
 * standart turlarni ham qayta nomlash xavfsiz.
 */
export async function PATCH(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = renameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const { kind, slug, label } = parsed.data;
  const clean = label.trim();
  const db = getAdminDb();
  const snap = await db.doc("metadata/taxonomy").get();
  const custom = ((snap.data() ?? {})[kind] ?? []) as TaxonomyItem[];

  const isBuiltin = BUILTIN[kind].some((item) => item.slug === slug);
  const existing = custom.find((item) => item.slug === slug);

  if (!isBuiltin && !existing) {
    return NextResponse.json({ error: "Bunday tur topilmadi." }, { status: 404 });
  }

  // Standart turning nomi ham `metadata/taxonomy` da saqlanadi va
  // birlashtirishda kod ichidagisidan ustun turadi.
  const next = existing
    ? custom.map((item) => (item.slug === slug ? { slug, label: clean } : item))
    : [...custom, { slug, label: clean }];

  await db.doc("metadata/taxonomy").set({ [kind]: next }, { merge: true });
  return NextResponse.json({ ok: true, item: { slug, label: clean } });
}

/** Turni o'chirish (mahsulotlarda ishlatilmayotgan bo'lsa). */
export async function DELETE(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const { kind, slug } = parsed.data;

  // Ishlatilayotgan turni o'chirish mahsulotlarni "nomsiz" qoldiradi.
  const field = kind === "categories" ? "category" : kind === "materials" ? "material" : "unit";
  const used = await getAdminDb().collection("products").where(field, "==", slug).limit(1).get();
  if (!used.empty) {
    return NextResponse.json(
      { error: "Bu tur mahsulotlarda ishlatilyapti. Avval ularni boshqa turga o'tkazing." },
      { status: 409 }
    );
  }

  const db = getAdminDb();
  const snap = await db.doc("metadata/taxonomy").get();
  const data = (snap.data() ?? {}) as Record<string, unknown>;
  const current = ((data[kind] ?? []) as TaxonomyItem[]).filter((item) => item.slug !== slug);

  // Standart turni "yashirilgan" ro'yxatiga qo'shamiz - kod ichidagi
  // ro'yxatdan o'chirib bo'lmaydi, lekin ko'rinmaydigan qila olamiz.
  const hiddenKey = `hidden_${kind}`;
  const hidden = new Set((data[hiddenKey] ?? []) as string[]);
  if (BUILTIN[kind].some((item) => item.slug === slug)) hidden.add(slug);

  await db.doc("metadata/taxonomy").set({ [kind]: current, [hiddenKey]: [...hidden] }, { merge: true });
  return NextResponse.json({ ok: true });
}
