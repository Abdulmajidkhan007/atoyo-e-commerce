import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { buildNameTokens } from "@/lib/search/tokens";
import { registerFacets } from "@/lib/products/facets";
import { parseCsv } from "@/lib/products/csv";
import { logAction } from "@/lib/telegram/action-log";
import type { Product, ProductCategory, ProductMaterial } from "@/types/product";

export const runtime = "nodejs";

const CATEGORIES: ProductCategory[] = [
  "pipes",
  "fittings",
  "faucets",
  "shower-systems",
  "boilers",
  "radiators",
  "pumps",
  "sanitary-ware",
];
const MATERIALS: ProductMaterial[] = [
  "polypropylene",
  "metal-plastic",
  "steel",
  "copper",
  "brass",
  "cast-iron",
  "pvc",
];

const bodySchema = z.object({ csv: z.string().min(1).max(5_000_000) });

/** Firestore batch chegarasi 500 - xavfsiz oraliq bilan bo'lib yozamiz. */
const BATCH_SIZE = 400;

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-") || "mahsulot"
  );
}

function toNumber(value: string | undefined): number | undefined {
  if (!value || !value.trim()) return undefined;
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * KATALOG IMPORTI (CSV). `id` ustuni to'ldirilgan qatorlar mavjud
 * mahsulotni yangilaydi, bo'sh bo'lsa yangi mahsulot yaratiladi.
 * Xato qatorlar butun importni to'xtatmaydi - ular hisobotda qaytariladi.
 */
export async function POST(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) return NextResponse.json({ error: "CSV matni yuborilmadi." }, { status: 400 });

  const rows = parseCsv(parsedBody.data.csv);
  if (rows.length === 0) return NextResponse.json({ error: "CSV bo'sh yoki noto'g'ri." }, { status: 400 });
  if (rows.length > 5000) {
    return NextResponse.json({ error: "Bir martada 5000 tagacha qator import qilinadi." }, { status: 400 });
  }

  const db = getAdminDb();
  const now = Date.now();
  const errors: string[] = [];
  const brands = new Set<string>();
  const countries = new Set<string>();
  let created = 0;
  let updated = 0;

  let batch = db.batch();
  let pending = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!;
    const lineNo = i + 2; // sarlavha 1-qator
    const name = (row.name ?? "").trim();

    if (!name) {
      errors.push(`${lineNo}-qator: nom bo'sh`);
      continue;
    }
    const price = toNumber(row.price);
    if (price === undefined || price < 0) {
      errors.push(`${lineNo}-qator: narx noto'g'ri`);
      continue;
    }
    const category = (row.category ?? "").trim() as ProductCategory;
    if (!CATEGORIES.includes(category)) {
      errors.push(`${lineNo}-qator: kategoriya noto'g'ri (${row.category ?? ""})`);
      continue;
    }
    const material = (row.material ?? "").trim() as ProductMaterial;
    if (!MATERIALS.includes(material)) {
      errors.push(`${lineNo}-qator: material noto'g'ri (${row.material ?? ""})`);
      continue;
    }

    const brand = (row.brand ?? "").trim();
    const country = (row.manufacturerCountry ?? "").trim();
    if (brand) brands.add(brand);
    if (country) countries.add(country);

    const images = (row.images ?? "")
      .split(/[|\n]/)
      .map((url) => url.trim())
      .filter((url) => url.startsWith("http"))
      .slice(0, 10);

    const diameterMm = toNumber(row.diameterMm);
    const lengthMm = toNumber(row.lengthMm);
    const weightKg = toNumber(row.weightKg);

    const id = (row.id ?? "").trim();
    const ref = id ? db.collection("products").doc(id) : db.collection("products").doc();
    const isUpdate = Boolean(id);

    const base = {
      name,
      nameSearchIndex: name.toLowerCase(),
      nameTokens: buildNameTokens(name, brand),
      description: (row.description ?? "").trim(),
      category,
      material,
      brand,
      manufacturerCountry: country,
      supplier: (row.supplier ?? "").trim(),
      price,
      discountPrice: toNumber(row.discountPrice) ?? null,
      stock: Math.max(0, Math.round(toNumber(row.stock) ?? 0)),
      dimensions: {
        ...(diameterMm !== undefined ? { diameterMm } : {}),
        ...(lengthMm !== undefined ? { lengthMm } : {}),
        ...(weightKg !== undefined ? { weightKg } : {}),
      },
      images,
      thumbnailUrl: images[0] ?? "",
      isActive: (row.isActive ?? "1").trim() !== "0",
      updatedAt: now,
    };

    if (isUpdate) {
      // Mavjud mahsulotda rasm ustuni bo'sh bo'lsa - eski rasmlar o'chmasin.
      const patch: Record<string, unknown> = { ...base };
      if (images.length === 0) {
        delete patch.images;
        delete patch.thumbnailUrl;
      }
      batch.set(ref, patch, { merge: true });
      updated += 1;
    } else {
      const product: Product = {
        ...base,
        id: ref.id,
        slug: `${slugify(name)}-${ref.id.slice(0, 6)}`,
        discountUntil: null,
        currency: "UZS",
        salesCount: 0,
        createdAt: now,
      };
      batch.set(ref, product);
      created += 1;
    }

    pending += 1;
    if (pending >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();

  for (const brand of brands) await registerFacets({ brand });
  for (const country of countries) await registerFacets({ country });

  if (created + updated > 0) {
    await logAction(
      `📤 CSV import (${admin.email ?? "admin"}): ${created} ta yangi, ${updated} ta yangilangan mahsulot`
    );
  }

  return NextResponse.json({ created, updated, skipped: errors.length, errors: errors.slice(0, 50) });
}
