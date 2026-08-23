/**
 * EXCEL FAYLLARINI QATOR OBYEKTLARIGA AYLANTIRISH.
 *
 * Mahsulot importi va optom mijozlar importi bir xil Excel o'qish
 * mantig'idan foydalanadi, faqat ustun nomlarini ichki kalitlarga
 * moslashtirish (`normalizeHeader`) har birida boshqacha - shuning
 * uchun u chaqiruvchidan parametr sifatida olinadi.
 */

/** Excel katakchasidagi qiymatni matnga keltiradi. */
export function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value).trim();
}

/** Excel faylini (birinchi varag'i) qator obyektlariga aylantiradi. */
export async function parseXlsx(
  base64: string,
  normalizeHeader: (header: string) => string
): Promise<Record<string, string>[]> {
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
