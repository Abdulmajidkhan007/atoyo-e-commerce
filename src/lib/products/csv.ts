import type { Product } from "@/types/product";

/** Eksport/import ustunlari - tartibi shu faylda yagona manba. */
export const CSV_COLUMNS = [
  "id",
  "name",
  "description",
  "category",
  "material",
  "brand",
  "manufacturerCountry",
  "supplier",
  "price",
  "discountPrice",
  "stock",
  "diameterMm",
  "lengthMm",
  "weightKg",
  "images",
  "isActive",
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

function escapeCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Vergul/qo'shtirnoq/yangi qator bo'lsa - qo'shtirnoqqa olinadi.
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Mahsulotlar ro'yxatini CSV matnga aylantiradi (Excel uchun BOM bilan). */
export function productsToCsv(products: Product[]): string {
  const rows = products.map((p) =>
    [
      p.id,
      p.name,
      p.description,
      p.category,
      p.material,
      p.brand,
      p.manufacturerCountry,
      p.supplier ?? "",
      p.price,
      p.discountPrice ?? "",
      p.stock,
      p.dimensions?.diameterMm ?? "",
      p.dimensions?.lengthMm ?? "",
      p.dimensions?.weightKg ?? "",
      p.images.join(" | "),
      p.isActive ? "1" : "0",
    ]
      .map(escapeCell)
      .join(",")
  );
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
 */
export function parseCsv(text: string): Record<string, string>[] {
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
        row[header] = (cells[i] ?? "").trim();
      });
      return row;
    });
}
