#!/usr/bin/env node
/**
 * NAMUNA EXCEL FAYLINI YASAYDI (public/namuna/atoyo-mahsulotlar.xlsx).
 *
 * Tashqi kutubxonasiz: .xlsx - bu oddiy ZIP ichidagi XML fayllar,
 * shuning uchun zip (deflate) va kerakli XML'lar shu yerda yasaladi.
 * Ikkita varaq bo'ladi:
 *   1) "Mahsulotlar"  - import qilinadigan qatorlar (turlar bilan);
 *   2) "Yo'riqnoma"   - har bir ustun nima ekani o'zbekcha.
 *
 * Ishga tushirish:  node scripts/make-sample-xlsx.js
 */
const { deflateRawSync } = require("node:zlib");
const { writeFileSync } = require("node:fs");
const path = require("node:path");

/* ---------------- ZIP ---------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  return (crc ^ -1) >>> 0;
}

/** Fayllar ro'yxatidan ZIP (deflate) yasaydi. */
function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.from(file.data, "utf8");
    const compressed = deflateRawSync(data);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versiya
    local.writeUInt16LE(0x0800, 6); // UTF-8 nomlar
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + compressed.length;
  }

  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralBuffer, end]);
}

/* ---------------- XLSX ---------------- */

const escapeXml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Ustun harfi: 1 -> A, 27 -> AA. */
function columnName(index) {
  let name = "";
  let n = index;
  while (n > 0) {
    const rest = (n - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    n = Math.floor((n - rest) / 26);
  }
  return name;
}

/**
 * Varaq XML. Matnlar `sharedStrings` orqali yoziladi (read-excel-file
 * shu ko'rinishni ishonchli o'qiydi), raqamlar - oddiy son.
 */
function sheetXml(rows, strings) {
  const body = rows
    .map((cells, r) => {
      const xmlCells = cells
        .map((value, c) => {
          if (value === "" || value === null || value === undefined) return "";
          const ref = `${columnName(c + 1)}${r + 1}`;
          if (typeof value === "number") return `<c r="${ref}"><v>${value}</v></c>`;
          let index = strings.indexOf(String(value));
          if (index === -1) index = strings.push(String(value)) - 1;
          return `<c r="${ref}" t="s"><v>${index}</v></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${xmlCells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function buildWorkbook(sheets) {
  const strings = [];
  const sheetXmls = sheets.map((sheet) => sheetXml(sheet.rows, strings));

  const sharedStrings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${strings
    .map((text) => `<si><t xml:space="preserve">${escapeXml(text)}</t></si>`)
    .join("")}</sst>`;

  const files = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
        .map(
          (_, i) =>
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        )
        .join(
          ""
        )}<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map(
          (sheet, i) =>
            `<sheet name="${escapeXml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
        )
        .join("")}</sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
        )
        .join(
          ""
        )}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
    },
    { name: "xl/sharedStrings.xml", data: sharedStrings },
    ...sheetXmls.map((data, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data })),
  ];

  return zip(files);
}

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
