import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { processQueue, queueSummary } from "@/lib/social/publish";
import { reportError } from "@/lib/ops/report-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * IJTIMOIY NAVBATNI AVTOMATIK BO'SHATISH.
 *
 * MUAMMO: `processQueue()` faqat admin panelidagi tugmadan
 * chaqirilardi. Admin o'sha ekranga kirmasa, Instagram/Facebook/
 * YouTube postlari `socialQueue` da cheksiz yotib qolardi.
 *
 * Endi Cloud Scheduler shu manzilni soatiga bir marta chaqiradi
 * (sozlash tartibi `docs/DEPLOY.md` da).
 *
 * HIMOYA: `CRON_SECRET` qo'yilmagan bo'lsa endpoint UMUMAN ishlamaydi
 * (503) - tasodifan ochiq qolib ketmasin. Sir `Authorization: Bearer
 * <sir>` sarlavhasida keladi va vaqt bo'yicha xavfsiz (timing-safe)
 * solishtiriladi.
 */

/** Bir chaqiruvda nechta post - Telegram/Meta chegaralariga urilmasin. */
const BATCH = 10;

function secretMatches(header: string | null, expected: string): boolean {
  const provided = header?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // `timingSafeEqual` uzunliklar teng bo'lishini talab qiladi.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET sozlanmagan." }, { status: 503 });
  }

  if (!secretMatches(request.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 401 });
  }

  try {
    const result = await processQueue(BATCH);
    // Hech narsa yuborilmagan bo'lsa jim o'tamiz - har soatda guruhga
    // "0 ta post" deb yozib turish keraksiz shovqin.
    return NextResponse.json({ ...result, queue: await queueSummary() });
  } catch (error) {
    await reportError("Ijtimoiy navbat (cron)", error);
    return NextResponse.json({ error: "Navbatni bo'shatishda xatolik." }, { status: 500 });
  }
}
