#!/usr/bin/env node
/**
 * 1C NARXNOMASINI IMPORT FAYLIGA O'GIRADI.
 *
 * Kirish  - do'konning "PRICE ATOYO" fayli: har bir brend alohida
 *           varaqda, ustunlari `N | Код | Номенклатура | OPTOM | DONA`,
 *           narxlar DOLLARDA.
 * Chiqish - saytning katalog importi tushunadigan bitta fayl
 *           (`public/namuna/atoyo-mahsulotlar.xlsx` bilan bir xil
 *           ustunlar), narxlar SO'MDA.
 *
 * Nima qilinadi:
 *   • nomdan brend, mahsulot turi (kategoriya), turi/rangi va kodi
 *     ajratiladi: "UNICORN SIFON vann S32 (1521) PCS" ->
 *     brend UNICORN, kategoriya "sifon", turi "vanna", kodi "S32 (1521)";
 *   • optom narx so'mga o'giriladi (100 so'mgacha yaxlitlanadi);
 *   • fayldagi dona narx saqlanib qolishi uchun har mahsulotga
 *     o'z ustama foizi yoziladi (`retailMarkupPercent`);
 *   • `id` ustuni bo'sh qoladi - import yangi mahsulot yaratadi;
 *   • zaxira 0: mahsulotlar kirim qilinganda to'ldiriladi.
 *
 * Ishlatish:
 *   node scripts/convert-price-list.js <manba.xlsx> [chiqish.xlsx] [--kurs=12600]
 */
const fs = require("node:fs");
const path = require("node:path");
const { readWorkbook, buildWorkbook } = require("./lib/xlsx");

/* ------------------------------------------------------------------ */
/* Lug'atlar                                                           */
/* ------------------------------------------------------------------ */

/**
 * MAHSULOT TURI -> KATEGORIYA. Kalit - nomda uchraydigan so'z (lotin
 * yoki kirill), qiymat - kategoriya slug'i va ko'rinadigan nomi.
 * Saytda allaqachon bor kategoriyalar (pipes, fittings, faucets,
 * shower-systems, boilers, radiators, pumps, sanitary-ware) o'sha
 * slug bilan ishlatiladi, qolganlari import paytida ochiladi.
 */
const CATEGORY_RULES = [
  // Mavjud kategoriyalar
  [["QUVUR", "TRUBA", "ТРУБА", "PPR", "PEX"], "pipes", "Quvurlar"],
  [
    ["MUFTA", "FITING", "FITTING", "UGOLOK", "PEREXOD", "TROYNIK", "PRESFITING", "REZBA",
     "AMERIKANKA", "SGON", "ZAGLUSHKA", "KLIPSA", "OTVOD", "ОТВОД", "MUFT", "RAKR", "RAKOR",
     "ADAPTER", "ARCHA", "IKSSENTRIK", "EKSSENTRIK", "XOMUT", "UDLINITEL", "NAKIDNOY",
     "FIKSATOR", "VODOROZETKA", "RAZBOR", "GAYKA", "SHTUTSER", "KOLENO",
     "ПЕРЕХОД", "МУФТА", "УГОЛОК", "ТРОЙНИК", "УДЛИН", "ВЫПУСК", "ШТУЦЕР"],
    "fittings",
    "Muftalar",
  ],
  [
    ["KRAN", "SMESITEL", "SMES", "СМЕС", "GUSAK", "QUYMA", "BUQA", "JUMRAK", "VENTIL", "VINTEL",
     "KALTA", "LAYLAK", "TURNA", "BABOCHKA", "BABICHKA", "SHAROVOY", "SHARAVOY",
     "КРАН", "СМЕСИТЕЛ", "ВЕНТИЛ"],
    "faucets",
    "Kranlar",
  ],
  [
    ["DUSH", "LEYKA", "ЛЕЙКА", "MIKROFON", "MIKRAFON", "STOYKA", "KABINA", "TAXORAT", "NASADKA"],
    "shower-systems",
    "Dush tizimlari",
  ],
  [["QOZON", "KOTEL", "KOTYOL", "BOILER", "KOLONKA", "ARISTON", "MINUTKA", "RASHBAK", "RASHIRITEL"], "boilers", "Isitish qozonlari"],
  [["RADIATOR", "BATAREYA"], "radiators", "Radiatorlar"],
  [["NASOS", "POMPA", "NASOS"], "pumps", "Nasoslar"],

  // Yangi kategoriyalar (import ularni o'zi ochadi)
  [["SIFON", "СИФОН", "VANYUCHKA", "BUTILKA"], "sifon", "Sifonlar"],
  [["LYUK", "ЛЮК", "REVIZIYA"], "lyuk", "Lyuklar"],
  [["SHLANG", "ШЛАНГ", "GIBKAY", "ГИБК"], "shlang", "Shlanglar"],
  [["FILTR", "ФИЛЬТР", "KARTRIJ"], "filtr", "Filtrlar"],
  [["MOYKA", "МОЙКА", "RAKOVINA", "РАКОВИНА"], "moyka", "Moyka va rakovinalar"],
  [["UNITAZ", "УНИТАЗ", "BIDE", "BACHOK", "BACHONKA", "KRISHKA", "SIDENYA"], "unitaz", "Unitaz va ehtiyot qismlari"],
  [["TRAP", "ТРАП"], "trap", "Traplar"],
  [["ДУШ", "ЛЕЙК"], "shower-systems", "Dush tizimlari"],
  [["KOLLEKTOR", "КОЛЛЕКТОР", "GREBENKA"], "kollektor", "Kollektorlar"],
  [["VESHILKA", "VESHALKA", "KRYUCHOK", "ILGICH"], "veshilka", "Ilgich va veshilkalar"],
  [["SUSHILKA", "POLOTENSE"], "sushilka", "Sushilkalar"],
  [["MUSTAXAB", "MUSTAHAB"], "mustaxab", "Mustaxablar"],
  [["KALSO", "STAKAN"], "kalso", "Stakan va kalsolar"],
  [["BUMAGA", "БУМАГ"], "bumaga", "Qog'oz ushlagichlar"],
  [["MILNITSA", "SOVUN"], "milnitsa", "Sovun idishlari"],
  [["OYNA", "ZERKAL"], "oyna", "Oynalar"],
  [["POLKA", "ПОЛКА"], "polka", "Polkalar"],
  [["TEN", "ТЭН"], "ten", "TEN (isitish elementi)"],
  [["OBRATKA", "KLAPAN", "REDUKTOR", "VOZDUX", "VOZDUZ"], "obratka", "Obratka va klapanlar"],
  [["GOFRA", "ГОФРА"], "gofra", "Gofralar"],
  [["KNOPKA", "КНОПКА"], "knopka", "Knopkalar"],
  [["MEXANIZM", "МЕХАНИЗМ", "ARMATURA", "PAPLAVOK", "POPLAVOK"], "mexanizm", "Bachok mexanizmlari"],
  [["SHOTKA", "ЁРШИК", "ERSHIK"], "shotka", "Shotkalar"],
  [["VANNA", "ВАННА", "DUGA", "PARDA", "SHTORA"], "vanna", "Vanna va pardalar"],
  [["CHELAK", "VEDRO"], "chelak", "Chelaklar"],
  [["TERMOSTAT", "TERMOMETR", "MANOMETR", "KONTROLKA", "DATCHIK"], "termostat", "Termostat va o'lchagichlar"],
  [
    ["SPLENKA", "LENTA", "FUM", "GERMETIK", "SILIKON", "JIDKIY", "RULON", "KLEY", "SKOTCH"],
    "germetik",
    "Lenta va germetiklar",
  ],
  [["SALNIK", "PROKLADKA", "REZINA", "MANJET", "KOLSO"], "prokladka", "Prokladka va salniklar"],
  [["DAZMOL", "QAYCHI", "PISTOLET", "VANTUS", "SHVABRA", "KURAK", "ASBOB", "KLYUCH", "OTVERTKA"], "asbob", "Asbob va jihozlar"],
  [["STABILIZATOR", "RELE", "AVTOMAT", "PROVOD", "ROZETKA"], "elektr", "Elektr jihozlari"],
  [["SALFETKA", "LIPUCHKA", "IDISH", "CHASHKA", "PODNOS", "KORZINKA"], "aksessuar", "Aksessuarlar"],
  [["DIMOXOD", "DIMOHOD"], "dimoxod", "Dimoxodlar"],
  [["NABOR", "KOMPLEKT"], "nabor", "Naborlar"],
  [["SCHYOTCHIK", "SCHETCHIK", "SCHYOT", "SUV HISOB"], "hisoblagich", "Hisoblagichlar"],
];

/** Rang so'zlari - alohida "Rangi" qatoriga chiqadi. */
const COLORS = [
  [["QORA", "ЧЕРН", "BLACK"], "Qora"],
  [["QIZIL", "КРАСН", "RED"], "Qizil"],
  [["KUK", "KOK", "СИН", "BLUE"], "Ko'k"],
  [["YASHIL", "ЗЕЛЕН"], "Yashil"],
  [["OQ", "БЕЛ", "WHITE"], "Oq"],
  [["NIKEL", "NIKL", "НИКЕЛ"], "Nikel"],
  [["TILLO", "TILLA", "GOLD", "ЗОЛОТ"], "Tillo"],
  [["BRONZA", "БРОНЗ"], "Bronza"],
  [["XROM", "CHROME", "ХРОМ"], "Xrom"],
  [["SARIQ", "ЖЕЛТ"], "Sariq"],
  [["KULRANG", "SERIY", "СЕР"], "Kulrang"],
  [["MOKRIY"], "Mokriy"],
  [["SATIN"], "Satin"],
];

/** Material so'zlari -> saytdagi material slug'i. */
const MATERIALS = [
  [["LATUN", "ЛАТУН", "BRASS"], "brass"],
  [["NERJ", "NERJAVEYKA", "PO'LAT", "POLAT", "STAL", "TEMIR", "STEEL", "INOX"], "steel"],
  [["PLAST", "PLASTIK", "PVX", "PVC", "PLASTMASSA"], "pvc"],
  [["POLIPROPILEN", "PPR"], "polypropylene"],
  [["METALLOPLAST", "METALLOPLASTIK"], "metal-plastic"],
  [["MIS", "MED", "COPPER"], "copper"],
  [["CHUGUN", "CHOYAN", "ЧУГУН"], "cast-iron"],
];

/** Davlat so'zlari. */
const COUNTRIES = [
  [["XITOY", "CHINA", "КИТАЙ"], "Xitoy"],
  [["TURK", "TURKIYA", "ТУРЦИЯ"], "Turkiya"],
  [["ITALY", "ITALIYA", "ИТАЛИЯ"], "Italiya"],
  [["ROSSIYA", "RUS", "РОССИЯ"], "Rossiya"],
  [["KOREYA", "KOREA"], "Koreya"],
  [["UZB", "O'ZBEK", "UZBEK"], "O'zbekiston"],
];

/**
 * Turi (variant) uchun ma'noli so'zlar. Nomdagi qolgan so'zlardan
 * faqat shular olinadi - tasodifiy qisqartmalar tushmasin.
 */
const TYPE_WORDS = {
  VANN: "vanna",
  VANNA: "vanna",
  RAK: "rakovina",
  RAKOVINA: "rakovina",
  MOYKA: "moyka",
  KALTA: "kalta",
  UZUN: "uzun",
  QALIN: "qalin",
  INGICHKA: "ingichka",
  KATTA: "katta",
  KICHIK: "kichik",
  KVADRAT: "kvadrat",
  YUMALOQ: "yumaloq",
  ICHKI: "ichki",
  TASHQI: "tashqi",
  BURCHAK: "burchak",
  TUGRI: "to'g'ri",
  POL: "polga",
  DEVOR: "devorga",
  NASTENNIY: "devorga",
  ODDIY: "oddiy",
  LYUKS: "lyuks",
  EKO: "eko",
  PREMIUM: "premium",
  DUO: "duo",
  TRIO: "trio",
  NABOR: "nabor",
  KOMPLEKT: "komplekt",
};

/* ------------------------------------------------------------------ */
/* Yordamchilar                                                        */
/* ------------------------------------------------------------------ */

const upper = (text) => text.toUpperCase().replace(/[’'`ʻʼ]/g, "");

/** Qadoq ("12pcs", "80шт", "PCS") - tavsifga yoziladi, nomdan olinadi. */
function extractPack(name) {
  const match = name.match(/(\d+)\s*(?:PCS|ШТ|PC)\b/i);
  const pack = match ? Number(match[1]) : null;
  const cleaned = name
    .replace(/\b\d*\s*(?:PCS|ШТ|PC)\b\.?/gi, " ")
    // "(6*70)" - qutidagi o'lcham, nomga kerak emas.
    .replace(/\(\s*\d+\s*[*x]\s*\d+\s*\)?/gi, " ");
  return { pack, cleaned };
}

/**
 * Kod (artikul): nomdagi "S32 (1521)", "M02-5B", "8213-1J", "1010.001"
 * kabi bo'laklar. O'lcham ("15/12", "1/2") kod hisoblanmaydi - unda
 * kasr chizig'i bo'ladi.
 */
function extractCode(name) {
  const parts = [];
  let rest = name;

  // Qavs ichidagi raqam: "(1521)"
  const paren = rest.match(/\((\d{3,6})\)/);
  if (paren) {
    parts.push(`(${paren[1]})`);
    rest = rest.replace(paren[0], " ");
  }

  // Artikulga o'xshash bo'laklar: harf+raqam yoki uzun raqam.
  const candidates = rest
    .split(/\s+/)
    .map((word) => word.replace(/[(),]/g, "").trim())
    .filter((word) => {
      if (!/^[A-Za-z]{0,4}[-_.]?\d{2,6}[A-Za-z]{0,3}(?:[-_.][A-Za-z0-9]{1,6})*\.?$/.test(word)) return false;
      const digits = (word.match(/\d/g) ?? []).length;
      const hasLetter = /[A-Za-z]/.test(word);
      // "40" kabi qisqa raqam - o'lcham, kod emas.
      return digits >= 3 || (hasLetter && digits >= 2);
    })
    .sort((a, b) => b.length - a.length);

  const token = candidates[0];
  if (token) {
    parts.unshift(token.replace(/\.$/, ""));
    rest = rest.replace(token, " ");
  }

  return { code: parts.join(" ").trim(), rest };
}

/** Ro'yxatdagi so'zlardan biri matnda bormi. */
function findRule(rules, words) {
  for (const rule of rules) {
    const [keys] = rule;
    if (keys.some((key) => words.some((word) => word === key || word.startsWith(key)))) return rule;
  }
  return null;
}

/**
 * Kategoriya nomdagi BIRINCHI tur so'ziga qarab tanlanadi: "BEAR SHLANG
 * 40 SMES" - bu shlang (smesitel uchun), kran emas.
 */
function findCategory(words) {
  for (const word of words) {
    for (const rule of CATEGORY_RULES) {
      if (rule[0].some((key) => word === key || word.startsWith(key))) return rule;
    }
  }
  return null;
}

/**
 * "UNITAZ OSMA 7306" -> "Unitaz osma 7306". Raqamli bo'laklar (kod),
 * 3 harfgacha qisqartmalar va brendlar o'zgarmaydi.
 */
function tidyName(text) {
  const words = text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  return words
    .map((word, index) => {
      if (/\d/.test(word) || word.length <= 3) return word;
      const lower = word.toLowerCase();
      return index === 0 || word === word.toUpperCase()
        ? lower.charAt(0).toUpperCase() + lower.slice(1)
        : word;
    })
    .join(" ")
    // Yopilmagan qavs va ortiqcha belgilar qolmasin.
    .replace(/\((?![^()]*\))/g, " ")
    .replace(/(?<!\([^()]*)\)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, "")
    .trim();
}

function titleCase(text) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Nomni bo'laklarga ajratish                                          */
/* ------------------------------------------------------------------ */

function parseName(rawName, sheetBrand, brandSet) {
  const original = rawName.replace(/\s+/g, " ").trim();
  const { pack, cleaned } = extractPack(original);
  const { code, rest } = extractCode(cleaned);

  const words = rest
    .split(/[\s,/]+/)
    .map((word) => word.replace(/[()"']/g, "").trim())
    .filter(Boolean);
  const upperWords = words.map(upper);

  // 1) Brend: varaq nomi yoki nomning birinchi so'zi (tanish brend bo'lsa).
  let brand = "";
  const first = upperWords[0] ?? "";
  if (brandSet.has(first)) brand = titleCase(words[0]);
  else if (sheetBrand && upperWords.includes(upper(sheetBrand.split(" ")[0]))) brand = titleCase(sheetBrand);
  else if (sheetBrand && sheetBrand !== "ARALASH") brand = titleCase(sheetBrand);

  // 2) Kategoriya: nomdagi tur so'zi.
  const categoryRule = findCategory(upperWords);
  const category = categoryRule ? categoryRule[1] : "sanitary-ware";
  const categoryLabel = categoryRule ? categoryRule[2] : "Santexnika buyumlari";

  // 3) Rang va material.
  const colorRule = findRule(COLORS, upperWords);
  const color = colorRule ? colorRule[1] : "";
  const materialRule = findRule(MATERIALS, upperWords);
  const material = materialRule ? materialRule[1] : "";
  const countryRule = findRule(COUNTRIES, upperWords);
  const country = countryRule ? countryRule[1] : "";

  // 4) Turi: qolgan ma'noli so'zlar (vanna, kalta, kvadrat...).
  const typeWords = [];
  for (const word of upperWords) {
    const value = TYPE_WORDS[word];
    if (value && !typeWords.includes(value)) typeWords.push(value);
  }
  const type = typeWords.slice(0, 2).join(" ");

  /**
   * 5) Ko'rinadigan nom - asl nomning tozalangan ko'rinishi: qadoq
   * ("12pcs") olib tashlanadi, BOSH HARFLI matn o'qishga qulay holga
   * keltiriladi (kod va qisqartmalar o'z holicha qoladi).
   */
  const name = tidyName(cleaned) || original;

  return { original, name, brand, category, categoryLabel, type, color, material, country, code, pack };
}

/* ------------------------------------------------------------------ */
/* Asosiy oqim                                                         */
/* ------------------------------------------------------------------ */

const COLUMNS = [
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
  "retailMarkupPercent",
  "stock",
  "variantGroup",
  "variantValue",
  "variantSku",
  "diameterMm",
  "lengthMm",
  "weightKg",
  "images",
  "draft",
  "isActive",
];

function toNumber(value) {
  if (typeof value === "number") return value;
  const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function main() {
  const args = process.argv.slice(2);
  const rate = Number((args.find((a) => a.startsWith("--kurs=")) ?? "").split("=")[1] || 12600);
  const files = args.filter((a) => !a.startsWith("--"));
  const source = files[0];
  const target = files[1] ?? path.join(process.cwd(), "atoyo-import.xlsx");

  if (!source) {
    console.error("Ishlatish: node scripts/convert-price-list.js <manba.xlsx> [chiqish.xlsx] [--kurs=12600]");
    process.exit(1);
  }

  const workbook = readWorkbook(fs.readFileSync(source));

  // Varaq nomlari - brendlar ro'yxati (ARALASH - aralash varaq).
  const brandSet = new Set(
    Object.keys(workbook)
      .filter((sheet) => sheet !== "ARALASH")
      .flatMap((sheet) => sheet.split(" "))
      .map(upper)
  );
  // Nomlarda tez-tez uchraydigan boshqa brendlar.
  for (const extra of [
    "BELEZZO", "BEAR", "RONAS", "FIRMER", "NANO", "NERO", "VENUS", "JASEE", "CALORIE",
    "EXPERT", "INKOER", "COMES", "NOLF", "NUR", "GROSNA", "ARISTON", "KAPE", "AWP",
    "METAKSAN", "TEBO", "VALTEC", "KONNER", "BASU", "HAI", "ROYAL", "MAXXUS", "UNICORN",
    "EMERICH", "KING", "NOVA", "BOOU", "BOTU",
  ]) {
    brandSet.add(extra);
  }

  const rows = [];
  const categories = new Map();
  const unmatched = [];
  let skipped = 0;

  for (const [sheet, sheetRows] of Object.entries(workbook)) {
    for (const cells of sheetRows.slice(1)) {
      const rawName = String(cells[2] ?? "").trim();
      const wholesaleUsd = toNumber(cells[3]);
      const retailUsd = toNumber(cells[4]);
      if (!rawName || !wholesaleUsd || wholesaleUsd <= 0) {
        if (rawName) skipped += 1;
        continue;
      }

      const parsed = parseName(rawName, sheet, brandSet);
      if (parsed.category === "sanitary-ware") unmatched.push(rawName);
      categories.set(parsed.category, parsed.categoryLabel);

      // Optom narx so'mda, 100 so'mgacha yaxlitlangan.
      const price = Math.max(100, Math.round((wholesaleUsd * rate) / 100) * 100);
      // Dona narx fayldagidek chiqishi uchun ustama foizi hisoblanadi.
      const markup =
        retailUsd && retailUsd > wholesaleUsd
          ? Math.round((retailUsd / wholesaleUsd - 1) * 1000) / 10
          : 0;

      const description = [
        `1C kodi: ${String(cells[1] ?? "").replace(/\s/g, "")}`,
        parsed.pack ? `Qadoqda: ${parsed.pack} dona` : "",
      ]
        .filter(Boolean)
        .join(". ");

      // Turi va rangi - "Turi|Rangi" ko'rinishidagi tur qatorlari.
      const groups = [];
      const values = [];
      if (parsed.type) {
        groups.push("Turi");
        values.push(parsed.type);
      }
      if (parsed.color) {
        groups.push("Rangi");
        values.push(parsed.color);
      }

      const row = {
        id: "",
        sku: parsed.code || String(cells[1] ?? "").replace(/\s/g, ""),
        name: parsed.name,
        description,
        category: parsed.category,
        material: parsed.material,
        unit: "dona",
        brand: parsed.brand,
        manufacturerCountry: parsed.country,
        supplier: "",
        price,
        discountPrice: "",
        retailMarkupPercent: markup || "",
        stock: 0,
        variantGroup: groups.join("|"),
        variantValue: values.join("|"),
        variantSku: values.length > 0 ? parsed.code : "",
        diameterMm: "",
        lengthMm: "",
        weightKg: "",
        images: "",
        draft: "",
        isActive: 1,
      };

      rows.push(COLUMNS.map((column) => row[column] ?? ""));
    }
  }

  // Bir xil nom bir necha marta chiqsa import ularni bitta mahsulotga
  // yig'ib yuboradi - shuning uchun nomlarni yakkalashtiramiz.
  const seen = new Map();
  const nameColumn = COLUMNS.indexOf("name");
  for (const row of rows) {
    const key = String(row[nameColumn]).toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) row[nameColumn] = `${row[nameColumn]} #${count}`;
  }

  const categorySheet = [
    ["Kategoriya (slug)", "Nomi", "Mahsulot soni"],
    ...[...categories.entries()].map(([slug, label]) => [
      slug,
      label,
      rows.filter((row) => row[COLUMNS.indexOf("category")] === slug).length,
    ]),
  ];

  const guide = [
    ["Ustun", "Ma'nosi"],
    ["id", "Bo'sh - import yangi mahsulot yaratadi"],
    ["sku", "Mahsulot kodi (nomdan ajratilgan, topilmasa 1C kodi)"],
    ["name", "Brend + tur + turi + kodi"],
    ["description", "Asl nomi, 1C kodi va qadoq"],
    ["category", "Mahsulot turi (yangi kategoriyalar import paytida ochiladi)"],
    ["price", `OPTOM narx, so'mda (kurs ${rate})`],
    ["retailMarkupPercent", "Dona ustamasi, foizda - fayldagi DONA narxdan hisoblangan"],
    ["stock", "0 - zaxira kirim qilinganda to'ldiriladi"],
    ["variantGroup / variantValue", "Turi va rangi"],
    ["isActive", "1 - katalogda ko'rinadi"],
  ];

  const out = buildWorkbook([
    { name: "Mahsulotlar", rows: [COLUMNS, ...rows] },
    { name: "Kategoriyalar", rows: categorySheet },
    { name: "Yo'riqnoma", rows: guide },
  ]);
  fs.writeFileSync(target, out);

  console.log(`Yozildi: ${target}`);
  console.log(`Mahsulot: ${rows.length} ta, kategoriya: ${categories.size} ta, kurs: ${rate}`);
  if (skipped > 0) console.log(`Narxsiz qatorlar tashlandi: ${skipped} ta`);
  if (unmatched.length > 0) {
    console.log(`Turi aniqlanmagan (santexnika buyumlariga tushdi): ${unmatched.length} ta`);
    console.log(unmatched.slice(0, 20).map((name) => `  • ${name}`).join("\n"));
  }
}

if (require.main === module) main();

module.exports = { parseName, CATEGORY_RULES, TYPE_WORDS, upper };
