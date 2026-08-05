#!/usr/bin/env node
/**
 * NAMUNA EXCEL FAYLINI YASAYDI (public/namuna/atoyo-mahsulotlar.xlsx).
 *
 * Faylni `scripts/lib/xlsx.js` yozadi (tashqi kutubxonasiz).
 * Ikkita varaq bo'ladi:
 *   1) "Mahsulotlar"  - import qilinadigan qatorlar (turlar bilan);
 *   2) "Yo'riqnoma"   - har bir ustun nima ekani o'zbekcha.
 *
 * Ishga tushirish:  node scripts/make-sample-xlsx.js
 */
const { writeFileSync } = require("node:fs");
const path = require("node:path");
const { buildWorkbook } = require("./lib/xlsx");

/* ---------------- Namuna ma'lumotlari ---------------- */

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

/** Qatorni ustun nomlari bo'yicha yig'adi (bo'sh kataklar - ""). */
function row(values) {
  return COLUMNS.map((column) => values[column] ?? "");
}

const PRODUCTS = [
  // Oddiy mahsulot: turlari yo'q, narx va zaxira o'z ustunlarida.
  row({
    sku: "PPR-25",
    name: "PPR quvur 25mm",
    description: "Issiq va sovuq suv uchun polipropilen quvur",
    category: "pipes",
    material: "polypropylene",
    unit: "metr",
    brand: "Tebo",
    manufacturerCountry: "Turkiya",
    supplier: "Akmal aka",
    price: 45000,
    stock: 120,
    diameterMm: 25,
    lengthMm: 4000,
    weightKg: 1.2,
    isActive: 1,
  }),
  row({
    sku: "KR-12",
    name: "Latun kran 1/2",
    description: "Yarim dyuymli to'p kran",
    category: "faucets",
    material: "brass",
    unit: "dona",
    brand: "Valtec",
    manufacturerCountry: "Italiya",
    supplier: "Bek ota",
    price: 89000,
    discountPrice: 79000,
    stock: 40,
    diameterMm: 15,
    weightKg: 0.35,
    images: "https://example.com/kran-1.jpg | https://example.com/kran-2.jpg",
    isActive: 1,
  }),
  // TURLARI bor mahsulot: har bir tur ALOHIDA QATOR. Umumiy maydonlar
  // (kategoriya, brend, rasm...) birinchi qatordan olinadi.
  row({
    sku: "BASU-MOYKA",
    name: "Basu moyka",
    description: "Zanglamas po'lat oshxona moykasi",
    category: "sanitary-ware",
    material: "steel",
    unit: "dona",
    brand: "Basu",
    manufacturerCountry: "Xitoy",
    supplier: "Akmal aka",
    price: 850000,
    stock: 4,
    variantGroup: "O'lcham",
    variantValue: "50x60",
    variantSku: "BASU-5060",
    images: "https://example.com/moyka.jpg",
    isActive: 1,
  }),
  row({
    name: "Basu moyka",
    price: 990000,
    stock: 2,
    variantGroup: "O'lcham",
    variantValue: "60x80",
    variantSku: "BASU-6080",
  }),
  row({
    name: "Basu moyka",
    price: 1150000,
    stock: 0,
    variantGroup: "O'lcham",
    variantValue: "80x100",
    variantSku: "BASU-80100",
  }),
  // Ikki o'lchovli tur: ustun ichida "|" bilan.
  row({
    sku: "RAD-AL",
    name: "Alyuminiy radiator",
    description: "Seksiyali alyuminiy radiator",
    category: "radiators",
    material: "steel",
    unit: "dona",
    brand: "Konner",
    manufacturerCountry: "Rossiya",
    supplier: "Bek ota",
    price: 320000,
    stock: 15,
    variantGroup: "Balandlik|Rang",
    variantValue: "500mm|Oq",
    variantSku: "RAD-500-OQ",
    isActive: 1,
  }),
  row({
    name: "Alyuminiy radiator",
    price: 360000,
    stock: 8,
    variantGroup: "Balandlik|Rang",
    variantValue: "500mm|Kulrang",
    variantSku: "RAD-500-KUL",
  }),
  row({
    name: "Alyuminiy radiator",
    price: 410000,
    stock: 6,
    variantGroup: "Balandlik|Rang",
    variantValue: "800mm|Oq",
    variantSku: "RAD-800-OQ",
  }),
  // Chernovik: faqat nom bilan ochiladi, qolgani keyin to'ldiriladi.
  row({ name: "Sirkulyatsion nasos (nomi aniqlanmagan)", draft: 1 }),
];

const GUIDE = [
  ["Ustun", "Ma'nosi", "Majburiymi", "Misol"],
  ["id", "Mavjud mahsulotni yangilash uchun. Bo'sh bo'lsa - yangi mahsulot", "yo'q", "Xy7Kd..."],
  ["sku", "Do'kon kodi / artikul", "yo'q", "PPR-25"],
  ["name", "Mahsulot nomi", "HA", "PPR quvur 25mm"],
  ["description", "Tavsif", "yo'q", "Issiq suv uchun"],
  ["category", "Kategoriya slug'i (admin paneldagi ro'yxatdan)", "HA", "pipes"],
  ["material", "Material slug'i", "HA", "polypropylene"],
  ["unit", "Sotish turi: dona, metr, kg, litr...", "yo'q", "metr"],
  ["brand", "Brend", "yo'q", "Tebo"],
  ["manufacturerCountry", "Ishlab chiqaruvchi mamlakat", "yo'q", "Turkiya"],
  ["supplier", "Kimdan kelgan (yetkazib beruvchi)", "yo'q", "Akmal aka"],
  ["price", "OPTOM narx (so'm). Dona narx ustama foizi bilan o'zi hisoblanadi", "HA", "45000"],
  ["discountPrice", "Chegirma narxi (optom)", "yo'q", "79000"],
  [
    "retailMarkupPercent",
    "Shu mahsulotning dona ustamasi, foizda. Bo'sh bo'lsa umumiy sozlamadagi foiz",
    "yo'q",
    "15",
  ],
  ["stock", "Zaxira (dona/metr...)", "yo'q", "120"],
  ["", "", "", ""],
  ["TURLAR (variantlar)", "Bitta mahsulotning o'lcham/rang bo'yicha ko'rinishlari", "", ""],
  [
    "variantGroup",
    "Tur qatorining nomi. Ikkita bo'lsa \"|\" bilan: O'lcham|Rang",
    "tur bo'lsa HA",
    "O'lcham",
  ],
  [
    "variantValue",
    "Shu qatordagi turning qiymati. Ikkita bo'lsa \"|\" bilan: 50x60|Oq",
    "tur bo'lsa HA",
    "50x60",
  ],
  ["variantSku", "Turning o'z kodi", "yo'q", "BASU-5060"],
  [
    "",
    "Har bir tur ALOHIDA QATOR bo'ladi; nomi (yoki id si) bir xil qatorlar bitta mahsulotga yig'iladi. Narx va zaxira har bir turda o'zining ustunida turadi.",
    "",
    "",
  ],
  [
    "",
    "Mahsulotning umumiy narxi eng arzon turdan, zaxirasi esa turlar yig'indisidan olinadi.",
    "",
    "",
  ],
  ["", "", "", ""],
  ["diameterMm", "Diametri (mm)", "yo'q", "25"],
  ["lengthMm", "Uzunligi (mm)", "yo'q", "4000"],
  ["weightKg", "Og'irligi (kg)", "yo'q", "1.2"],
  ["images", "Rasm havolalari, \" | \" bilan ajratiladi (faylni Excel ichiga qo'yib bo'lmaydi)", "yo'q", "https://..."],
  ["draft", "1 bo'lsa - chernovik: katalogga chiqmaydi, keyin to'ldiriladi", "yo'q", "1"],
  ["isActive", "0 bo'lsa - sotuvdan olinadi", "yo'q", "1"],
  ["", "", "", ""],
  [
    "Ustun nomlari o'zbekcha ham bo'lishi mumkin:",
    "Nomi, Narxi, Zaxira, Kodi, Kategoriya, Material, Brend, Turi (=variantGroup), Razmer (=variantValue), Tur kodi",
    "",
    "",
  ],
];

const workbook = buildWorkbook([
  { name: "Mahsulotlar", rows: [COLUMNS, ...PRODUCTS] },
  { name: "Yo'riqnoma", rows: GUIDE },
]);

const target = path.join(__dirname, "..", "public", "namuna", "atoyo-mahsulotlar.xlsx");
writeFileSync(target, workbook);
console.log(`Yozildi: ${target} (${workbook.length} bayt)`);
