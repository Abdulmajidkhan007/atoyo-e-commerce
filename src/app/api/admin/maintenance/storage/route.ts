import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";
import { deleteOrphanFiles, scanOrphanFiles } from "@/lib/storage/cleanup";
import { validationMessage } from "@/lib/http/validation";

export const runtime = "nodejs";
/** Katalog katta bo'lsa skanerlash uzoq davom etadi. */
export const maxDuration = 300;

/**
 * STORAGE TOZALASH.
 *
 * `GET`  — faqat HISOBOT: nechta yetim fayl bor va ular qancha joy
 *          egallayapti. Hech narsa o'chirilmaydi.
 * `POST` — o'chirish (tasdiq so'zi bilan). Ro'yxat serverda QAYTA
 *          hisoblanadi, mijoz yuborgan yo'llar ishlatilmaydi.
 *
 * Faqat loyiha egasi (`requireOwner`) — bu qaytarib bo'lmaydigan amal.
 */
export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const report = await scanOrphanFiles();
  return NextResponse.json({
    scanned: report.scanned,
    referenced: report.referenced,
    tooNew: report.tooNew,
    count: report.orphans.length,
    bytes: report.bytes,
    // Ro'yxatning boshi - adminga "nima o'chadi" ko'rinib tursin.
    sample: report.orphans.slice(0, 20),
  });
}

const schema = z.object({
  /** Tasodifiy bosishning oldini olish uchun aniq so'z talab qilinadi. */
  confirm: z.literal("TOZALASH"),
});

export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  const result = await deleteOrphanFiles();
  await logAction(
    `🧹 Storage tozalandi: ${result.deleted} ta fayl, ${(result.bytes / 1048576).toFixed(1)} MB`
  );
  return NextResponse.json(result);
}
