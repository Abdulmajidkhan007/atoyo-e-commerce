import { NextResponse } from "next/server";
import { drainChannelQueue } from "@/lib/telegram/channel";
import { channelQueueSummary } from "@/lib/telegram/channel-queue";
import { reportError } from "@/lib/ops/report-error";
import { secretMatches } from "@/lib/http/secret-match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * KANAL NAVBATINI AVTOMATIK BO'SHATISH.
 *
 * Tezlik chegarasidan oshgan e'lonlar (masalan 10 daqiqada 5 tadan
 * ko'p mahsulot kirim qilinganda) navbatda kutadi. Shu manzil
 * jadval bo'yicha chaqirilib, vaqti kelganlarini chiqaradi.
 *
 * Cron sozlanmagan bo'lsa ham navbat qotib qolmaydi: keyingi e'lon
 * yuborilganda `announceProduct` o'zi ikkita eskisini chiqaradi.
 * Lekin ishonchli yo'l - shu cron.
 *
 * HIMOYA: `CRON_SECRET` qo'yilmagan bo'lsa endpoint UMUMAN ishlamaydi
 * (503). Sir `Authorization: Bearer <sir>` sarlavhasida keladi va
 * vaqt bo'yicha xavfsiz solishtiriladi.
 */

/** Bir chaqiruvda ko'pi bilan shuncha post (tezlik chegarasi ham bor). */
const BATCH = 5;

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET sozlanmagan." }, { status: 503 });
  }
  if (!secretMatches(request.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 401 });
  }

  try {
    const result = await drainChannelQueue(BATCH);
    // Navbat holati faqat MA'LUMOT uchun - u o'qilmasa ham asosiy ish
    // (postlarni chiqarish) bajarilgan hisoblanadi.
    const queue = await channelQueueSummary().catch(() => ({ pending: 0, next: null }));
    return NextResponse.json({ ...result, queue });
  } catch (error) {
    await reportError("Kanal navbati (cron)", error);
    return NextResponse.json({ error: "Navbatni bo'shatishda xatolik." }, { status: 500 });
  }
}
