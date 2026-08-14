import { NextResponse } from "next/server";
import { getAppUpdate } from "@/lib/app/version";
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
 */
export async function GET() {
  const update = await getAppUpdate();
  return NextResponse.json(update, { headers: publicCacheHeaders(600) });
}
