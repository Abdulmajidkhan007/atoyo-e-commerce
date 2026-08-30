import { NextResponse } from "next/server";
import { getAppUpdate } from "@/lib/app/version";
import { getTelegramSecrets } from "@/lib/telegram/secrets";
import { publicCacheHeaders } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ILOVANING OXIRGI VERSIYASI (ochiq).
 *
 * Android ilovasi har ochilganda shu manzilni so'raydi va o'zining
 * versiyasi bilan solishtiradi. Ochiq ma'lumot - maxfiy narsa yo'q,
 * shuning uchun 10 daqiqa keshlanadi (minglab qurilma bir vaqtda
 * so'rasa ham bazaga tegmaydi).
 *
 * Shu yerda bot useri ham beriladi: bot almashtirilsa ilovadagi
 * "Telegram" tugmasi ESKI botga olib bormasin (u qattiq yozilgan
 * bo'lsa har almashtirishda yangi APK kerak bo'lardi).
 */
export async function GET() {
  const [update, secrets] = await Promise.all([getAppUpdate(), getTelegramSecrets()]);
  return NextResponse.json(
    { ...update, botUsername: secrets.botUsername || "Atoyo_uz_bot" },
    { headers: publicCacheHeaders(600) }
  );
}
