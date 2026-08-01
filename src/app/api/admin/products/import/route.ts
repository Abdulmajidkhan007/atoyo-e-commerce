import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { buildNameTokens } from "@/lib/search/tokens";
import { registerFacets } from "@/lib/products/facets";
import { parseCsv } from "@/lib/products/csv";
import { DEFAULT_UNIT } from "@/lib/products/taxonomy";
import { logAction } from "@/lib/telegram/action-log";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { reserveProductCodes } from "@/lib/products/product-code";
import type { Product, ProductCategory, ProductMaterial } from "@/types/product";

export const runtime = "nodejs";

/**
 * Import ikki ko'rinishda keladi:
 *   • `csv`   - CSV matni (admin panel faylni o'zi o'qiydi);
 *   • `xlsx`  - Excel faylining base64 ko'rinishi (bir bosishda yuklash).
 * Excel varag'ining birinchi qatori sarlavha bo'lishi kerak - ustun
 * nomlari CSV bilan bir xil (namuna: /namuna/atoyo-mahsulotlar.xlsx).
 */
const bodySchema = z.union([
  z.object({ csv: z.string().min(1).max(5_000_000) }),
  z.object({ xlsx: z.string().min(1).max(12_000_000) }),
]);

/** Excel katakchasidagi qiymatni CSV bilan bir xil matnga keltiradi. */
function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value).trim();
}

/** Excel faylini CSV import bilan bir xil qator obyektlariga aylantiradi. */
async function parseXlsx(base64: string): Promise<Record<string, string>[]> {
  // `readSheet` - birinchi varaq (namunadagi "Yo'riqnoma" varag'i o'qilmaydi).
  const { readSheet } = await import("read-excel-file/node");
  const rows = (await readSheet(Buffer.from(base64, "base64"))) as unknown[][];
  if (rows.length < 2) return [];

  const headers = (rows[0] ?? []).map((cell) => cellToText(cell));
  return rows.slice(1).flatMap((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (header) row[header] = cellToText(cells[i]);
    });
    // Butunlay bo'sh qatorlar (Excel'da tez-tez uchraydi) tashlab yuboriladi.
    return Object.values(row).some((value) => value !== "") ? [row] : [];
  });
}

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
  if (!parsedBody.success) {
    return NextResponse.json({ error: "CSV yoki Excel fayli yuborilmadi." }, { status: 400 });
  }

  let rows: Record<string, string>[];
  if ("xlsx" in parsedBody.data) {
    try {
      rows = await parseXlsx(parsedBody.data.xlsx);
    } catch (error) {
      console.error("Excel faylni o'qishda xato:", error);
      return NextResponse.json(
        { error: "Excel faylni o'qib bo'lmadi. .xlsx formatida ekanini tekshiring." },
        { status: 400 }
      );
    }
  } else {
    rows = parseCsv(parsedBody.data.csv);
  }

  if (rows.length === 0) return NextResponse.json({ error: "Fayl bo'sh yoki noto'g'ri." }, { status: 400 });
  if (rows.length > 5000) {
    return NextResponse.json({ error: "Bir martada 5000 tagacha qator import qilinadi." }, { status: 400 });
  }

  // Kategoriya/material/sotish turi ro'yxatlari: standart + admin qo'shganlari.
  const taxonomy = await getTaxonomy();
  const categorySlugs = new Set(taxonomy.categories.map((item) => item.slug));
  const materialSlugs = new Set(taxonomy.materials.map((item) => item.slug));
  const unitSlugs = new Set(taxonomy.units.map((item) => item.slug));

  const db = getAdminDb();
  const now = Date.now();
  const errors: string[] = [];
  const brands = new Set<string>();
  const countries = new Set<string>();
  const suppliers = new Set<string>();
  let created = 0;
  let updated = 0;

  let batch = db.batch();
  let pending = 0;
  // Yangi mahsulotlar uchun tartib raqamlari oldindan (bir tranzaksiyada)
  // ajratiladi - har bir qator uchun alohida so'rov qilinmasin.
  const newRowCount = rows.filter((row) => !(row.id ?? "").trim()).length;
  const codes = await reserveProductCodes(newRowCount);
  let codeIndex = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!;
    const lineNo = i + 2; // sarlavha 1-qator
    const name = (row.name ?? "").trim();

    if (!name) {
      errors.push(`${lineNo}-qator: nom bo'sh`);
      continue;
    }
    /**
     * CHERNOVIK qatorlari (`draft` ustuni 1): mahsulot faqat nomi bilan
     * ochiladi - narx, kategoriya va material keyin to'ldiriladi, zaxira
     * esa kirim orqali keladi. Bir vaqtda minglab nomni yaratib olish
     * uchun shu qulay: katalogga chiqmaydi, kanalga e'lon qilinmaydi.
     */
    const isDraftRow = ["1", "true", "ha", "yes", "chernovik"].includes(
      (row.draft ?? "").trim().toLowerCase()
    );

    const price = toNumber(row.price);
    if (!isDraftRow && (price === undefined || price < 0)) {
      errors.push(`${lineNo}-qator: narx noto'g'ri`);
      continue;
    }
    const category = (row.category ?? "").trim() as ProductCategory;
    if (category && !categorySlugs.has(category)) {
      errors.push(`${lineNo}-qator: kategoriya noto'g'ri (${row.category ?? ""})`);
      continue;
    }
    if (!category && !isDraftRow) {
      errors.push(`${lineNo}-qator: kategoriya bo'sh`);
      continue;
    }
    const material = (row.material ?? "").trim() as ProductMaterial;
    if (material && !materialSlugs.has(material)) {
      errors.push(`${lineNo}-qator: material noto'g'ri (${row.material ?? ""})`);
      continue;
    }
    if (!material && !isDraftRow) {
      errors.push(`${lineNo}-qator: material bo'sh`);
      continue;
    }

    const brand = (row.brand ?? "").trim();
    const country = (row.manufacturerCountry ?? "").trim();
    if (brand) brands.add(brand);
    if (country) countries.add(country);
    const supplier = (row.supplier ?? "").trim();
    if (supplier) suppliers.add(supplier);

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

    const unitValue = (row.unit ?? "").trim();
    if (unitValue && !unitSlugs.has(unitValue)) {
      errors.push(`${lineNo}-qator: sotish turi noto'g'ri (${unitValue})`);
      continue;
    }
    const unit = unitValue || DEFAULT_UNIT;

    const sku = (row.sku ?? "").trim();

    const base = {
      name,
      sku,
      nameSearchIndex: name.toLowerCase(),
      nameTokens: buildNameTokens(name, brand, sku),
      description: (row.description ?? "").trim(),
      category,
      material,
      unit,
      brand,
      manufacturerCountry: country,
      supplier,
      price: price ?? 0,
      discountPrice: toNumber(row.discountPrice) ?? null,
      stock: isDraftRow ? 0 : Math.max(0, Math.round(toNumber(row.stock) ?? 0)),
      dimensions: {
        ...(diameterMm !== undefined ? { diameterMm } : {}),
        ...(lengthMm !== undefined ? { lengthMm } : {}),
        ...(weightKg !== undefined ? { weightKg } : {}),
      },
      images,
      thumbnailUrl: images[0] ?? "",
      isActive: isDraftRow ? false : (row.isActive ?? "1").trim() !== "0",
      isDraft: isDraftRow,
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
        code: codes[codeIndex++],
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
  for (const supplier of suppliers) await registerFacets({ supplier });

  if (created + updated > 0) {
    await logAction(
      `📤 ${"xlsx" in parsedBody.data ? "Excel" : "CSV"} import (${admin.email ?? "admin"}): ${created} ta yangi, ${updated} ta yangilangan mahsulot`
    );
  }

  return NextResponse.json({ created, updated, skipped: errors.length, errors: errors.slice(0, 50) });
}
