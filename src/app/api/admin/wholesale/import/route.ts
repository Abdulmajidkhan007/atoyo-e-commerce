import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/firebase/session";
import { createWholesaleClient, notifyStaff } from "@/lib/wholesale/clients";
import { parseCsv } from "@/lib/products/csv";
import { parseXlsx } from "@/lib/products/xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OPTOM MIJOZLARNI EXCEL/CSV DAN YUKLASH (1C ro'yxati).
 *
 * Ustun nomlari o'zbekcha (namuna: /namuna/atoyo-optom-mijozlar.xlsx):
 *   № | Ismi | Telefon | Do'kon nomi | Manzil | Telegram | Izoh
 *
 * Har bir mijozga kalit avtomatik yaratiladi. Telefoni allaqachon
 * ro'yxatda bo'lsa - takror qo'shilmaydi, eskisi qoladi.
 */
const bodySchema = z.union([
  z.object({ csv: z.string().min(1).max(3_000_000) }),
  z.object({ xlsx: z.string().min(1).max(8_000_000) }),
]);

/** Ustun nomlari har xil yozilishi mumkin - hammasini bitta kalitga keltiramiz. */
const COLUMN_ALIASES: Record<string, string[]> = {
  number: ["№", "n", "no", "raqam", "tartib", "id"],
  name: ["ismi", "ism", "mijoz", "f.i.o", "fio", "name"],
  phone: ["telefon", "tel", "telefon raqami", "raqam", "phone"],
  shopName: ["do'kon nomi", "dokon nomi", "do'kon", "dokon", "magazin", "shop"],
  address: ["manzil", "address", "adres", "joylashuv"],
  telegramUsername: ["telegram", "tg", "username"],
  note: ["izoh", "note", "qo'shimcha"],
};

function normalizeHeader(header: string): string {
  const clean = header.trim().toLowerCase().replace(/[’‘`´]/g, "'");
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(clean)) return key;
  }
  return clean;
}

export async function POST(request: Request) {
  const admin = await requirePermission("users", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Fayl o'qilmadi." }, { status: 400 });

  const rows =
    "xlsx" in parsed.data
      ? await parseXlsx(parsed.data.xlsx, normalizeHeader)
      : parseCsv(parsed.data.csv, { normalizeHeaders: false }).map((row) => {
          const mapped: Record<string, string> = {};
          for (const [key, value] of Object.entries(row)) mapped[normalizeHeader(key)] = value;
          return mapped;
        });

  const created: { number: number; shopName: string; accessKey: string }[] = [];
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const line = index + 2; // 1-qator sarlavha
    try {
      if (!row.phone || !row.name) {
        errors.push(`${line}-qator: ism yoki telefon yo'q.`);
        continue;
      }
      const client = await createWholesaleClient({
        name: row.name,
        phone: row.phone,
        shopName: row.shopName || row.name,
        address: row.address ?? "",
        telegramUsername: row.telegramUsername,
        note: row.note,
        number: Number(row.number) || undefined,
      });
      created.push({ number: client.number, shopName: client.shopName, accessKey: client.accessKey });
    } catch (error) {
      errors.push(`${line}-qator: ${error instanceof Error ? error.message : "xato"}`);
    }
  }

  if (created.length > 0) {
    await notifyStaff(`📥 <b>Optom mijozlar yuklandi</b>\n\n${created.length} ta mijoz ro'yxatga qo'shildi.`);
  }

  return NextResponse.json({ created, errors, total: rows.length });
}
