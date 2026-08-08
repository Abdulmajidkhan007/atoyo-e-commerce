import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { buildNameTokens } from "@/lib/search/tokens";
import { registerFacets } from "@/lib/products/facets";
import { normalizeHeader, parseCsv, variantsFromRows } from "@/lib/products/csv";
import { DEFAULT_UNIT, matchTaxonomy, slugify as taxonomySlug } from "@/lib/products/taxonomy";
import { logAction } from "@/lib/telegram/action-log";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { reserveProductCodes } from "@/lib/products/product-code";
import type { Product, ProductCategory, ProductMaterial } from "@/types/product";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

/**
 * Import ikki ko'rinishda keladi:
 *   • `csv`   - CSV matni (admin panel faylni o'zi o'qiydi);
 *   • `xlsx`  - Excel faylining base64 ko'rinishi (bir bosishda yuklash).
 * Excel varag'ining birinchi qatori sarlavha bo'lishi kerak - ustun
 * nomlari CSV bilan bir xil (namuna: /namuna/atoyo-mahsulotlar.xlsx).
 */
const bodySchema = z.union([
  z.object({ csv: z.string().min(1).max(5_000_000), publish: z.boolean().optional() }),
  z.object({ xlsx: z.string().min(1).max(12_000_000), publish: z.boolean().optional() }),
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

  const headers = (rows[0] ?? []).map((cell) => normalizeHeader(cellToText(cell)));
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

  // Import qilinganlar darhol saytda ko'rinsinmi. Standart - YO'Q:
  // katta importda rasmsiz/chala mahsulotlar katalogni buzadi.
  const publish = parsedBody.data.publish === true;

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

  /**
   * YANGI KATEGORIYA/MATERIAL AVTOMATIK OCHILADI.
   *
   * Katta ro'yxat (masalan 1C dagi butun narxnoma) importda o'nlab yangi
   * turni olib keladi - har birini qo'lda ochish o'rniga import ularni
   * `metadata/taxonomy` ga qo'shib qo'yadi. Faylda slug ("sifon") ham,
   * ko'rinadigan nom ("Sifon") ham bo'lishi mumkin.
   */
  const newCategories: { slug: string; label: string }[] = [];
  const newMaterials: { slug: string; label: string }[] = [];

  function resolveTaxonomy(
    kind: "categories" | "materials",
    raw: string
  ): string | null {
    const value = raw.trim();
    if (!value) return null;

    const known = kind === "categories" ? categorySlugs : materialSlugs;
    if (known.has(value)) return value;

    const matched = matchTaxonomy(
      kind === "categories" ? taxonomy.categories : taxonomy.materials,
      value
    );
    if (matched) return matched;

    const slug = taxonomySlug(value);
    if (!slug) return null;
    if (!known.has(slug)) {
      known.add(slug);
      const label = value.charAt(0).toUpperCase() + value.slice(1);
      (kind === "categories" ? newCategories : newMaterials).push({ slug, label });
      (kind === "categories" ? taxonomy.categories : taxonomy.materials).push({ slug, label });
    }
    return slug;
  }

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

  /**
   * QATORLARNI MAHSULOTGA YIG'ISH.
   *
   * Turlari bor mahsulot bir nechta qator bo'lib keladi (har bir tur -
   * alohida qator, o'z narxi va zaxirasi bilan). Qatorlar `id` bo'yicha,
   * u bo'lmasa nom bo'yicha bitta guruhga yig'iladi; umumiy maydonlar
   * (kategoriya, brend, rasm...) guruhning BIRINCHI qatoridan olinadi.
   */
  interface RowGroup {
    rows: { row: Record<string, string>; lineNo: number }[];
  }
  const groups: RowGroup[] = [];
  const groupByKey = new Map<string, RowGroup>();

  rows.forEach((row, i) => {
    const lineNo = i + 2; // sarlavha 1-qator
    const id = (row.id ?? "").trim();
    const name = (row.name ?? "").trim();
    if (!id && !name) {
      errors.push(`${lineNo}-qator: nom bo'sh`);
      return;
    }
    const key = id ? `id:${id}` : `name:${name.toLowerCase()}`;
    let group = groupByKey.get(key);
    if (!group) {
      group = { rows: [] };
      groupByKey.set(key, group);
      groups.push(group);
    }
    group.rows.push({ row, lineNo });
  });

  // Yangi mahsulotlar uchun tartib raqamlari oldindan (bir tranzaksiyada)
  // ajratiladi - har bir qator uchun alohida so'rov qilinmasin.
  const newRowCount = groups.filter((group) => !(group.rows[0]!.row.id ?? "").trim()).length;
  const codes = await reserveProductCodes(newRowCount);
  let codeIndex = 0;

  for (const group of groups) {
    const { row, lineNo } = group.rows[0]!;
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

    /**
     * TURLAR: guruhdagi har bir qatorda `variantValue` bo'lsa - o'sha
     * qator bitta tur (narxi va zaxirasi bilan).
     */
    const { axes, variants, errors: variantErrors } = variantsFromRows(group.rows, {
      requirePrice: !isDraftRow,
    });
    errors.push(...variantErrors);

    /**
     * Turlari bor mahsulotda `price` - eng arzon turning narxi,
     * `stock` - hamma turlar yig'indisi (katalogdagi saralash va
     * filtrlar shu maydonlar bo'yicha ishlaydi).
     */
    const price =
      variants.length > 0
        ? Math.min(...variants.map((variant) => variant.price))
        : toNumber(row.price);
    if (!isDraftRow && (price === undefined || price < 0)) {
      errors.push(`${lineNo}-qator: narx noto'g'ri`);
      continue;
    }
    const category = (resolveTaxonomy("categories", row.category ?? "") ?? "") as ProductCategory;
    if (!category && !isDraftRow) {
      errors.push(`${lineNo}-qator: kategoriya bo'sh`);
      continue;
    }
    // Material ixtiyoriy: katta narxnomalarda u ko'pincha ko'rsatilmaydi.
    const material = (resolveTaxonomy("materials", row.material ?? "") ?? "") as ProductMaterial;

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
      discountPrice: variants.length > 0 ? null : (toNumber(row.discountPrice) ?? null),
      /**
       * Shu mahsulotning dona ustamasi (foiz). Bo'sh bo'lsa `null` -
       * umumiy sozlamadagi foiz ishlatiladi.
       */
      retailMarkupPercent: (() => {
        const markup = toNumber(row.retailMarkupPercent);
        return markup !== undefined && markup >= 0 ? markup : null;
      })(),
      stock: isDraftRow
        ? 0
        : variants.length > 0
          ? variants.reduce((sum, variant) => sum + variant.stock, 0)
          : Math.max(0, Math.round(toNumber(row.stock) ?? 0)),
      variantAxes: axes,
      variants,
      dimensions: {
        ...(diameterMm !== undefined ? { diameterMm } : {}),
        ...(lengthMm !== undefined ? { lengthMm } : {}),
        ...(weightKg !== undefined ? { weightKg } : {}),
      },
      images,
      thumbnailUrl: images[0] ?? "",
      /**
       * SAYTDA KO'RINISHI.
       *
       * Katta import (masalan 1C narxnomasi) rasmsiz, kategoriyasi
       * chala mahsulotlarni olib keladi - ular darhol katalogga
       * chiqsa sayt ko'rimsiz bo'ladi. Shuning uchun standart holatda
       * import qilinganlar YOPIQ keladi; admin katalogni tartibga
       * solib bo'lgach "Saytda ochish" tugmasi bilan ochadi
       * (`/admin/katalog/tartib`).
       *
       * Faylda `isActive` ustuni bo'lsa - u baribir kuchda qoladi.
       */
      isActive: isDraftRow
        ? false
        : publish && (row.isActive ?? "1").trim() !== "0",
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
      // Faylda tur ustunlari to'ldirilmagan bo'lsa - mavjud turlar
      // o'chib ketmasin (ularni admin panelidan olib tashlash mumkin).
      if (variants.length === 0) {
        delete patch.variantAxes;
        delete patch.variants;
      }
      batch.set(ref, patch, { merge: true });
      updated += 1;
    } else {
      const product: Product = {
        ...base,
        id: ref.id,
        code: codes[codeIndex++],
        slug: `${slugify(name, { fallback: "mahsulot" })}-${ref.id.slice(0, 6)}`,
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

  // Importda paydo bo'lgan yangi kategoriya/materiallar ro'yxatga qo'shiladi.
  if (newCategories.length > 0 || newMaterials.length > 0) {
    await db.doc("metadata/taxonomy").set(
      {
        ...(newCategories.length > 0
          ? { categories: FieldValue.arrayUnion(...newCategories) }
          : {}),
        ...(newMaterials.length > 0 ? { materials: FieldValue.arrayUnion(...newMaterials) } : {}),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  }

  for (const brand of brands) await registerFacets({ brand });
  for (const country of countries) await registerFacets({ country });
  for (const supplier of suppliers) await registerFacets({ supplier });

  if (created + updated > 0) {
    await logAction(
      `📤 ${"xlsx" in parsedBody.data ? "Excel" : "CSV"} import (${admin.email ?? "admin"}): ` +
        `${created} ta yangi, ${updated} ta yangilangan mahsulot` +
        (publish ? " — saytda ochiq" : " — SAYTDA YOPIQ (tartibga solingach ochiladi)")
    );
  }

  return NextResponse.json({
    published: publish,
    created,
    updated,
    skipped: errors.length,
    errors: errors.slice(0, 50),
    // Yangi ochilgan kategoriyalar - admin ularni ko'rib chiqsin.
    newCategories: newCategories.map((item) => item.label),
  });
}
