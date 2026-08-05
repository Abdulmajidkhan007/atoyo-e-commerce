import { axisKeyOf, variantIdOf } from "./variants";
import type { Product, ProductVariant, VariantAxis } from "@/types/product";

/** Eksport/import ustunlari - tartibi shu faylda yagona manba. */
export const CSV_COLUMNS = [
  "id",
  "sku",
  "name",
  "description",
  "category",
  "material",
  "unit",
  "brand",
  "manufacturerCountry",
  "supplier",
  "price",
  "discountPrice",
  /** Shu mahsulotning dona (chakana) ustamasi, foizda. Bo'sh - umumiy sozlama. */
  "retailMarkupPercent",
  "stock",
  /**
   * TURLAR (variantlar). Bitta mahsulotning har bir turi ALOHIDA QATOR
   * bo'lib keladi; qatorlar `id` (yoki `name`) bo'yicha bitta mahsulotga
   * yig'iladi:
   *
   *   name          | variantGroup     | variantValue | variantSku | price | stock
   *   Basu moyka    | O'lcham          | 50x60        | BS-5060    | 850000| 4
   *   Basu moyka    | O'lcham          | 60x80        | BS-6080    | 990000| 2
   *
   * Ikki o'lchovli tur kerak bo'lsa ustun ichida "|" bilan yoziladi:
   *   variantGroup = "O'lcham|Qalinlik", variantValue = "50x60|0.3mm".
   * `variantValue` bo'sh bo'lsa - oddiy (tursiz) mahsulot qatori.
   */
  "variantGroup",
  "variantValue",
  "variantSku",
  "diameterMm",
  "lengthMm",
  "weightKg",
  "images",
  "isActive",
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

/** Tur ustunlaridagi ko'p qiymat ajratgichi ("50x60|0.3mm"). */
export const VARIANT_SEPARATOR = "|";

/** "50x60|0.3mm" -> ["50x60", "0.3mm"] */
export function splitVariantCell(value: string | undefined): string[] {
  return (value ?? "")
    .split(VARIANT_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * O'ZBEKCHA SARLAVHALAR. 1C dan yoki qo'lda tayyorlangan faylda ustun
 * nomlari o'zbekcha bo'lishi mumkin - import ularni ham tushunadi.
 * Kalitlar kichik harfda va bo'shliqsiz solishtiriladi.
 */
const HEADER_ALIASES: Record<string, string> = {
  id: "id",
  kod: "sku",
  kodi: "sku",
  artikul: "sku",
  nomi: "name",
  nom: "name",
  mahsulot: "name",
  mahsulotnomi: "name",
  tavsif: "description",
  izoh: "description",
  kategoriya: "category",
  material: "material",
  birlik: "unit",
  olchov: "unit",
  sotishturi: "unit",
  brend: "brand",
  mamlakat: "manufacturerCountry",
  ishlabchiqaruvchi: "manufacturerCountry",
  yetkazuvchi: "supplier",
  kimdan: "supplier",
  narx: "price",
  narxi: "price",
  optomnarx: "price",
  chegirma: "discountPrice",
  chegirmanarxi: "discountPrice",
  ustama: "retailMarkupPercent",
  ustamafoiz: "retailMarkupPercent",
  donaustama: "retailMarkupPercent",
  foiz: "retailMarkupPercent",
  zaxira: "stock",
  soni: "stock",
  qoldiq: "stock",
  turi: "variantGroup",
  turnomi: "variantGroup",
  turguruhi: "variantGroup",
  tur: "variantValue",
  turqiymati: "variantValue",
  razmer: "variantValue",
  olcham: "variantValue",
  turkodi: "variantSku",
  rasmlar: "images",
  rasm: "images",
  faol: "isActive",
  chernovik: "draft",
};

/**
 * Sarlavhani ichki ustun nomiga keltiradi. Inglizcha nomlar
 * o'zgarishsiz qoladi, o'zbekchalari tarjima qilinadi, notanishi
 * o'zicha qoladi (import uni e'tiborsiz qoldiradi).
 */
export function normalizeHeader(header: string): string {
  const raw = header.trim();
  if ((CSV_COLUMNS as readonly string[]).includes(raw) || raw === "draft") return raw;

  const key = raw
    .toLowerCase()
    .replace(/['ʼ‘’`]/g, "")
    .replace(/[^a-z0-9а-яё]+/gi, "");
  return HEADER_ALIASES[key] ?? raw;
}

/** Import qatoridagi sonni o'qiydi ("1 200,50" ham to'g'ri tushuniladi). */
export function csvNumber(value: string | undefined): number | undefined {
  if (!value || !value.trim()) return undefined;
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export interface VariantRow {
  row: Record<string, string>;
  lineNo: number;
}

/**
 * BITTA MAHSULOTNING TURLARINI QATORLARDAN YIG'ADI.
 *
 * Har bir qator - bitta tur (`variantValue` to'ldirilgani). Qatorlar
 * nomi birinchi turdan olinadi; ikki o'lchovli turda ustunlar ichida
 * "|" ishlatiladi ("O'lcham|Rang" va "50x60|Oq").
 *
 * Xato qator butun mahsulotni to'xtatmaydi - u `errors` ga tushadi.
 */
export function variantsFromRows(
  rows: VariantRow[],
  options: { requirePrice: boolean } = { requirePrice: true }
): { axes: VariantAxis[]; variants: ProductVariant[]; errors: string[] } {
  const errors: string[] = [];
  const variantRows = rows.filter(({ row }) => (row.variantValue ?? "").trim());
  if (variantRows.length === 0) return { axes: [], variants: [], errors };

  const labels = splitVariantCell(variantRows[0]!.row.variantGroup);
  const axes: VariantAxis[] = (labels.length > 0 ? labels : ["Turi"]).map((label) => ({
    key: axisKeyOf(label),
    label,
    values: [],
  }));

  const variants: ProductVariant[] = [];

  for (const { row, lineNo } of variantRows) {
    const values = splitVariantCell(row.variantValue);
    if (values.length !== axes.length) {
      errors.push(`${lineNo}-qator: tur qiymatlari soni mos emas (${axes.length} ta kutilgan)`);
      continue;
    }

    const price = csvNumber(row.price);
    if (options.requirePrice && (price === undefined || price < 0)) {
      errors.push(`${lineNo}-qator: tur narxi noto'g'ri`);
      continue;
    }

    const selection: Record<string, string> = {};
    axes.forEach((axis, index) => {
      const value = values[index]!;
      selection[axis.key] = value;
      if (!axis.values.includes(value)) axis.values.push(value);
    });

    const id = variantIdOf(axes, selection);
    const variant: ProductVariant = {
      id,
      options: selection,
      price: price ?? 0,
      discountPrice: csvNumber(row.discountPrice) ?? null,
      stock: Math.max(0, Math.round(csvNumber(row.stock) ?? 0)),
      sku: (row.variantSku ?? "").trim(),
    };

    // Bir xil tur ikki marta kelsa - oxirgisi qoladi.
    const existing = variants.findIndex((item) => item.id === id);
    if (existing >= 0) variants[existing] = variant;
    else variants.push(variant);
  }

  return variants.length > 0 ? { axes, variants, errors } : { axes: [], variants: [], errors };
}

function escapeCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Vergul/qo'shtirnoq/yangi qator bo'lsa - qo'shtirnoqqa olinadi.
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Bitta qator: mahsulotning o'zi yoki uning bitta turi. */
function productRow(p: Product, variant?: ProductVariant): string {
  const axes = p.variantAxes ?? [];
  return [
    p.id,
    p.sku ?? "",
    p.name,
    p.description,
    p.category,
    p.material,
    p.unit ?? "dona",
    p.brand,
    p.manufacturerCountry,
    p.supplier ?? "",
    variant ? variant.price : p.price,
    (variant ? variant.discountPrice : p.discountPrice) ?? "",
    p.retailMarkupPercent ?? "",
    variant ? variant.stock : p.stock,
    variant ? axes.map((axis) => axis.label).join(VARIANT_SEPARATOR) : "",
    variant ? axes.map((axis) => variant.options[axis.key] ?? "").join(VARIANT_SEPARATOR) : "",
    variant ? (variant.sku ?? "") : "",
    p.dimensions?.diameterMm ?? "",
    p.dimensions?.lengthMm ?? "",
    p.dimensions?.weightKg ?? "",
    p.images.join(" | "),
    p.isActive ? "1" : "0",
  ]
    .map(escapeCell)
    .join(",");
}

/**
 * Mahsulotlar ro'yxatini CSV matnga aylantiradi (Excel uchun BOM bilan).
 * Turlari bor mahsulot bir nechta qator bo'lib chiqadi - har bir tur
 * o'z narxi va zaxirasi bilan; shu fayl o'zgartirilib qaytib import
 * qilinsa turlar ham tiklanadi.
 */
export function productsToCsv(products: Product[]): string {
  const rows = products.flatMap((p) => {
    const variants = p.variants ?? [];
    const hasAxes = (p.variantAxes?.length ?? 0) > 0 && variants.length > 0;
    return hasAxes ? variants.map((variant) => productRow(p, variant)) : [productRow(p)];
  });
  return `﻿${CSV_COLUMNS.join(",")}\n${rows.join("\n")}\n`;
}

/** Bitta CSV qatorini ustunlarga ajratadi (qo'shtirnoq ichidagi vergulni hisobga oladi). */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

/**
 * CSV matnni sarlavha bo'yicha obyektlarga aylantiradi. Ustunlar tartibi
 * muhim emas - faqat nomlari CSV_COLUMNS dagidek bo'lsa yetadi.
 *
 * `normalizeHeaders: false` - sarlavhalar o'zgarishsiz qoladi (boshqa
 * bo'limlarning importi, masalan optom mijozlar ro'yxati, o'z ustun
 * nomlariga ega).
 */
export function parseCsv(
  text: string,
  options: { normalizeHeaders?: boolean } = {}
): Record<string, string>[] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const [headerLine, ...lines] = clean.split("\n");
  const headers = parseCsvLine(headerLine ?? "").map((h) => h.trim());

  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const cells = parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        const key = options.normalizeHeaders === false ? header : normalizeHeader(header);
        row[key] = (cells[i] ?? "").trim();
      });
      return row;
    });
}
