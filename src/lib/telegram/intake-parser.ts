import { matchTaxonomy, type Taxonomy } from "@/lib/products/taxonomy";
import type { ProductCategory, ProductMaterial } from "@/types/product";

/**
 * "KIRIM" TOPIC'idagi post izohini (caption) mahsulot maydonlariga
 * ajratadi. Format iloji boricha erkin: har qator "kalit: qiymat",
 * kalitlar o'zbekcha/ruscha/inglizcha bo'lishi mumkin. Kalit yozilmagan
 * birinchi qator - mahsulot nomi deb olinadi.
 *
 *   PPR quvur 25mm
 *   Narxi: 45 000
 *   Soni: 120
 *   Kimdan: Akmal aka
 *   Material: polipropilen
 *
 * Bu fayl faqat matn bilan ishlaydi (Firestore/Telegram'ga tegmaydi),
 * shuning uchun uni alohida sinash oson.
 */

export type IntakeField =
  | "name"
  | "price"
  | "stock"
  | "supplier"
  | "material"
  | "category"
  | "brand"
  | "country"
  | "description"
  | "discount"
  | "discountUntil"
  | "unit"
  | "sku"
  | "diameter"
  | "length"
  | "weight"
  /** Turlar qatorining nomi ("O'lcham", "O'lcham|Rang"). */
  | "variantAxis"
  /** Turlar ro'yxati - keyingi qatorlarda yoziladi. */
  | "variants";

/** Kalit so'zlar - normalizatsiyadan keyingi ko'rinishda (apostrofsiz, kichik). */
const FIELD_ALIASES: Record<string, IntakeField> = {
  nom: "name",
  nomi: "name",
  name: "name",
  mahsulot: "name",
  tovar: "name",
  nazvanie: "name",
  название: "name",

  narx: "price",
  narxi: "price",
  price: "price",
  summa: "price",
  sotuv: "price",
  "sotuv narxi": "price",
  cena: "price",
  цена: "price",

  son: "stock",
  soni: "stock",
  dona: "stock",
  miqdor: "stock",
  miqdori: "stock",
  zaxira: "stock",
  qoldiq: "stock",
  stock: "stock",
  kolichestvo: "stock",
  количество: "stock",

  kimdan: "supplier",
  "kimdan kelgan": "supplier",
  kelgan: "supplier",
  taminotchi: "supplier",
  yetkazuvchi: "supplier",
  "yetkazib beruvchi": "supplier",
  supplier: "supplier",
  postavshik: "supplier",
  поставщик: "supplier",

  material: "material",
  materiali: "material",
  xomashyo: "material",
  материал: "material",

  kategoriya: "category",
  turkum: "category",
  bolim: "category",
  category: "category",
  категория: "category",

  brend: "brand",
  brand: "brand",
  marka: "brand",
  бренд: "brand",

  davlat: "country",
  mamlakat: "country",
  country: "country",
  strana: "country",
  страна: "country",

  tavsif: "description",
  izoh: "description",
  tarif: "description",
  description: "description",
  описание: "description",

  chegirma: "discount",
  "chegirma narxi": "discount",
  aksiya: "discount",
  skidka: "discount",

  "chegirma muddati": "discountUntil",
  muddat: "discountUntil",
  muddati: "discountUntil",
  "amal qilish muddati": "discountUntil",

  diametr: "diameter",
  diametri: "diameter",
  diameter: "diameter",

  uzunlik: "length",
  uzunligi: "length",
  length: "length",

  kod: "sku",
  kodi: "sku",
  artikul: "sku",
  sku: "sku",
  code: "sku",
  "mahsulot kodi": "sku",
  артикул: "sku",

  "sotish turi": "unit",
  "olchov": "unit",
  "olchov birligi": "unit",
  birlik: "unit",
  unit: "unit",
  turi: "unit",

  "tur nomi": "variantAxis",
  "turlar nomi": "variantAxis",
  "tur qatori": "variantAxis",
  "olcham nomi": "variantAxis",

  turlar: "variants",
  variantlar: "variants",
  olchamlar: "variants",
  razmerlar: "variants",
  razmerlari: "variants",
  "turlari": "variants",

  ogirlik: "weight",
  ogirligi: "weight",
  vazn: "weight",
  weight: "weight",
};

const MATERIAL_ALIASES: Record<string, ProductMaterial> = {
  polipropilen: "polypropylene",
  polypropylene: "polypropylene",
  pp: "polypropylene",
  ppr: "polypropylene",
  metalloplastik: "metal-plastic",
  "metall plastik": "metal-plastic",
  "metal plastik": "metal-plastic",
  mp: "metal-plastic",
  polat: "steel",
  stal: "steel",
  steel: "steel",
  temir: "steel",
  "nerjaveyka": "steel",
  mis: "copper",
  copper: "copper",
  med: "copper",
  latun: "brass",
  brass: "brass",
  bronza: "brass",
  choyan: "cast-iron",
  chugun: "cast-iron",
  "cast iron": "cast-iron",
  pvx: "pvc",
  pvc: "pvc",
  plastik: "pvc",
  plastmassa: "pvc",
};

const CATEGORY_ALIASES: Record<string, ProductCategory> = {
  quvur: "pipes",
  quvurlar: "pipes",
  truba: "pipes",
  pipes: "pipes",
  mufta: "fittings",
  muftalar: "fittings",
  fitting: "fittings",
  fittings: "fittings",
  kran: "faucets",
  kranlar: "faucets",
  smesitel: "faucets",
  faucets: "faucets",
  dush: "shower-systems",
  "dush tizimi": "shower-systems",
  "dush tizimlari": "shower-systems",
  qozon: "boilers",
  kotyol: "boilers",
  kotel: "boilers",
  boilers: "boilers",
  radiator: "radiators",
  radiatorlar: "radiators",
  batareya: "radiators",
  nasos: "pumps",
  nasoslar: "pumps",
  pompa: "pumps",
  pumps: "pumps",
  santexnika: "sanitary-ware",
  "sanitary ware": "sanitary-ware",
  unitaz: "sanitary-ware",
  rakovina: "sanitary-ware",
};

/** Nom bo'yicha kategoriyani taxmin qilish (kategoriya yozilmagan bo'lsa). */
const CATEGORY_HINTS: [RegExp, ProductCategory][] = [
  [/quvur|truba|pipe/i, "pipes"],
  [/mufta|fitting|troynik|burchak|ugolnik/i, "fittings"],
  [/kran|smesitel|faucet/i, "faucets"],
  [/dush|leyka|shower/i, "shower-systems"],
  [/qozon|kotyol|kotel|boiler/i, "boilers"],
  [/radiator|batareya/i, "radiators"],
  [/nasos|pompa|pump/i, "pumps"],
];

/** Kalit/qiymatni solishtirish uchun soddalashtirish (apostrof, ʻ, ', ‘ va h.k.). */
function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’'`ʻʼ]/g, "")
    .replace(/[#*_]/g, "")
    // Emoji va boshqa belgilar kalitga qo'shilib ketmasin.
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAmount(text: string): number | null {
  // "45 000", "45,000", "45000 so'm", "120 dona" - hammasidan sonni ajratamiz.
  const digits = text.replace(/[\s,]/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!digits) return null;
  const value = Number(digits[0]);
  return Number.isFinite(value) ? value : null;
}

/** "31.12.2026" / "31-12-2026" / "2026-12-31" → epoch millis. */
export function parseDate(text: string): number | null {
  const clean = text.trim();
  const dmy = clean.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const date = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }
  const ymd = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    const date = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }
  return null;
}

/** Kirim izohidagi bitta tur (variant). */
/**
 * Tur qatorini bo'laklarga ajratadi: "50x60 - 850000 - 4 - BS-5060".
 *
 * Avval ATROFIDA BO'SHLIQ bo'lgan ajratgich bo'yicha bo'linadi - shunda
 * kod ichidagi chiziqcha ("BS-5060") saqlanib qoladi. Bo'shliqsiz
 * yozilgan bo'lsa ("50x60-850000-4") oddiy chiziqcha ham ishlaydi.
 */
function splitVariantLine(line: string): string[] {
  const spaced = line
    .split(/\s+[-—–]\s+|\s*[;\t]+\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (spaced.length >= 2) return spaced;

  return line
    .split(/[-—–;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export interface ParsedVariant {
  /** Qatorlar bo'yicha qiymatlar: ["50x60"] yoki ["500mm", "Oq"]. */
  values: string[];
  price: number;
  stock: number;
  sku: string;
}

export interface ParsedIntake {
  name: string;
  price: number | null;
  stock: number | null;
  supplier: string;
  material: ProductMaterial | null;
  category: ProductCategory | null;
  /** Sotish turi: dona / metr / kg ... */
  unit: string | null;
  /** Do'kon kodi / artikul. */
  sku: string;
  brand: string;
  manufacturerCountry: string;
  description: string;
  discountPrice: number | null;
  discountUntil: number | null;
  diameterMm: number | null;
  lengthMm: number | null;
  weightKg: number | null;
  /** Turlar qatorlarining nomlari ("O'lcham", ["Balandlik","Rang"]). */
  variantAxisLabels: string[];
  /** Turlar (bo'lsa, narx va zaxira shulardan olinadi). */
  variants: ParsedVariant[];
  /** To'ldirilmagan majburiy maydonlar (rasm bu ro'yxatga kirmaydi). */
  missing: IntakeField[];
  /** Tushunarsiz qiymatlar (masalan material nomi topilmadi). */
  warnings: string[];
}

/**
 * Nomdan kategoriya taxmini - endi kategoriya majburiy, lekin xato
 * xabarida "shu bo'lsa kerak" deb taklif qilish uchun ishlatiladi.
 */
export function guessCategory(name: string): ProductCategory | null {
  for (const [pattern, category] of CATEGORY_HINTS) {
    if (pattern.test(name)) return category;
  }
  return null;
}

/**
 * Izohni (caption) mahsulot maydonlariga ajratadi.
 *
 * `taxonomy` - kategoriya/material/sotish turi ro'yxatlari: admin panel
 * orqali qo'shilgan YANGI turlar ham shu yerdan keladi, ya'ni bot ularni
 * ham tanidi (masalan "Kategoriya: Kanalizatsiya").
 */
export function parseIntakeCaption(caption: string, taxonomy: Taxonomy): ParsedIntake {
  const values = new Map<IntakeField, string>();
  const warnings: string[] = [];
  const unlabeled: string[] = [];

  /**
   * "Turlar:" dan keyingi qatorlar - turlar ro'yxati (har biri bitta
   * tur). Kalitli yangi qator boshlanmaguncha shu ro'yxatga yig'iladi.
   */
  const variantLines: string[] = [];
  let collectingVariants = false;

  for (const rawLine of caption.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const separator = line.search(/[:=]|\s-\s/);
    let field: IntakeField | undefined;
    let value = "";
    if (separator > 0) {
      field = FIELD_ALIASES[normalizeKey(line.slice(0, separator))];
      if (field) {
        value = line
          .slice(separator)
          .replace(/^[:=]\s*|^\s-\s/, "")
          .trim();
      }
    }

    if (field === "variants") {
      collectingVariants = true;
      if (value) variantLines.push(value);
      continue;
    }

    if (field) {
      collectingVariants = false;
      // Bir maydon ikki marta yozilsa - birinchisi qoladi.
      if (!values.has(field)) values.set(field, value);
      continue;
    }

    if (collectingVariants) {
      variantLines.push(line);
      continue;
    }

    unlabeled.push(line);
  }

  // Kalitsiz birinchi qator - nom; qolganlari tavsifga qo'shiladi.
  if (!values.has("name") && unlabeled.length > 0) values.set("name", unlabeled.shift()!);
  if (!values.has("description") && unlabeled.length > 0) {
    values.set("description", unlabeled.join("\n"));
  }

  const name = (values.get("name") ?? "").trim();
  const price = values.has("price") ? parseAmount(values.get("price")!) : null;
  const stock = values.has("stock") ? parseAmount(values.get("stock")!) : null;
  const supplier = (values.get("supplier") ?? "").trim();

  // Material: avval qisqartma lug'ati (ppr, mp...), keyin taxonomy nomlari.
  let material: ProductMaterial | null = null;
  if (values.has("material")) {
    const raw = values.get("material")!;
    const key = normalizeKey(raw);
    material =
      MATERIAL_ALIASES[key] ??
      matchTaxonomy(taxonomy.materials, raw) ??
      Object.entries(MATERIAL_ALIASES).find(([alias]) => key.includes(alias))?.[1] ??
      null;
    if (!material) warnings.push(`Material tanilmadi: "${raw}"`);
  }

  let category: ProductCategory | null = null;
  if (values.has("category")) {
    const raw = values.get("category")!;
    const key = normalizeKey(raw);
    category =
      CATEGORY_ALIASES[key] ??
      matchTaxonomy(taxonomy.categories, raw) ??
      Object.entries(CATEGORY_ALIASES).find(([alias]) => key.includes(alias))?.[1] ??
      null;
    if (!category) warnings.push(`Kategoriya tanilmadi: "${raw}"`);
  }

  let unit: string | null = null;
  if (values.has("unit")) {
    const raw = values.get("unit")!;
    unit = matchTaxonomy(taxonomy.units, raw);
    if (!unit) warnings.push(`Sotish turi tanilmadi: "${raw}"`);
  }

  const discountPrice = values.has("discount") ? parseAmount(values.get("discount")!) : null;
  const discountUntil = values.has("discountUntil") ? parseDate(values.get("discountUntil")!) : null;
  if (values.has("discountUntil") && discountUntil === null) {
    warnings.push("Chegirma muddati o'qilmadi (kun.oy.yil ko'rinishida yozing).");
  }

  /**
   * TURLAR. Har bir qator: "qiymat - narx - soni [- kod]".
   * Ikki qatorli tur bo'lsa qiymatlar "|" bilan: "500mm|Oq - 320000 - 3".
   * Ajratgich sifatida "-", "—" yoki ";" ishlaydi.
   */
  const variantAxisLabels = (values.get("variantAxis") ?? "")
    .split("|")
    .map((label) => label.trim())
    .filter(Boolean);

  const variants: ParsedVariant[] = [];
  for (const line of variantLines) {
    const parts = splitVariantLine(line);
    if (parts.length < 2) {
      warnings.push(`Tur qatori tushunilmadi: "${line}"`);
      continue;
    }

    const [rawValues, rawPrice, rawStock, rawSku] = parts;
    const variantPrice = parseAmount(rawPrice!);
    if (variantPrice === null || variantPrice <= 0) {
      warnings.push(`Tur narxi o'qilmadi: "${line}"`);
      continue;
    }

    variants.push({
      values: rawValues!
        .split("|")
        .map((value) => value.trim())
        .filter(Boolean),
      price: variantPrice,
      stock: Math.max(0, Math.round(parseAmount(rawStock ?? "") ?? 0)),
      sku: (rawSku ?? "").trim(),
    });
  }

  // Qiymatlar soni qatorlar soniga mos kelmasa - o'sha tur tashlanadi.
  const axisCount = variantAxisLabels.length || (variants[0]?.values.length ?? 1);
  const usableVariants = variants.filter((variant) => {
    if (variant.values.length === axisCount) return true;
    warnings.push(`Tur qiymatlari soni mos emas: "${variant.values.join("|")}"`);
    return false;
  });

  /**
   * Turlari bor mahsulotda narx va zaxira TURLARDAN olinadi - izohda
   * alohida yozilishi shart emas.
   */
  const hasVariantRows = usableVariants.length > 0;
  const effectivePrice = hasVariantRows
    ? Math.min(...usableVariants.map((variant) => variant.price))
    : price;
  const effectiveStock = hasVariantRows
    ? usableVariants.reduce((sum, variant) => sum + variant.stock, 0)
    : stock;

  const missing: IntakeField[] = [];
  if (!name) missing.push("name");
  if (effectivePrice === null || effectivePrice <= 0) missing.push("price");
  if (effectiveStock === null || effectiveStock < 0) missing.push("stock");
  if (!supplier) missing.push("supplier");
  if (!material) missing.push("material");
  if (!category) missing.push("category");
  if (!unit) missing.push("unit");

  return {
    name,
    price: effectivePrice,
    stock: effectiveStock,
    supplier,
    material,
    category,
    unit,
    sku: (values.get("sku") ?? "").trim(),
    brand: (values.get("brand") ?? "").trim(),
    manufacturerCountry: (values.get("country") ?? "").trim(),
    description: (values.get("description") ?? "").trim(),
    discountPrice,
    discountUntil,
    diameterMm: values.has("diameter") ? parseAmount(values.get("diameter")!) : null,
    lengthMm: values.has("length") ? parseAmount(values.get("length")!) : null,
    weightKg: values.has("weight") ? parseAmount(values.get("weight")!) : null,
    variantAxisLabels: hasVariantRows
      ? variantAxisLabels.length > 0
        ? variantAxisLabels
        : ["Turi"]
      : [],
    variants: usableVariants,
    missing,
    warnings,
  };
}

export const INTAKE_FIELD_LABELS: Record<IntakeField, string> = {
  name: "Nomi",
  unit: "Sotish turi (dona/metr/kg...)",
  sku: "Kodi (artikul)",
  price: "Narxi",
  stock: "Soni",
  supplier: "Kimdan kelgan",
  material: "Materiali",
  category: "Kategoriya",
  brand: "Brend",
  country: "Davlat",
  description: "Tavsif",
  discount: "Chegirma",
  discountUntil: "Chegirma muddati",
  diameter: "Diametr",
  length: "Uzunlik",
  weight: "Og'irlik",
  variantAxis: "Tur nomi (O'lcham/Rang)",
  variants: "Turlar ro'yxati",
};

/**
 * TURLARI bor mahsulot namunasi. "Turlar:" dan keyingi har bir qator -
 * bitta tur: "qiymat - narx - soni - kod(ixtiyoriy)". Ikki qatorli tur
 * kerak bo'lsa: "Tur nomi: Balandlik|Rang" va "500mm|Oq - 320000 - 3".
 * Turlar bo'lsa umumiy "Narxi"/"Soni" yozilishi shart emas.
 */
export const INTAKE_VARIANT_TEMPLATE = [
  "Basu moyka",
  "Kategoriya: santexnika",
  "Material: polat",
  "Sotish turi: dona",
  "Kimdan: Akmal aka",
  "Tur nomi: O'lcham",
  "Turlar:",
  "50x60 - 850000 - 4 - BS-5060",
  "60x80 - 990000 - 2",
  "80x100 - 1150000 - 0",
].join("\n");

/** Xato bo'lganda ko'rsatiladigan namuna. */
export const INTAKE_TEMPLATE = [
  "PPR quvur 25mm",
  "Kategoriya: quvurlar",
  "Narxi: 45000",
  "Soni: 120",
  "Sotish turi: metr",
  "Kimdan: Akmal aka",
  "Material: polipropilen",
  "Kodi: PPR-25 (ixtiyoriy)",
].join("\n");
