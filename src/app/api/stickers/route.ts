import { NextResponse } from "next/server";
import { publicStickerPacks } from "@/lib/telegram/stickers";
import { publicCacheHeaders } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DO'KON STIKERLARI (ochiq).
 *
 * Telegram to'plami havolasi - saytdagi "Stikerlarimizni oling"
 * bo'limi shuni o'qiydi. Ichida maxfiy narsa yo'q: to'plam
 * baribir havola orqali hammaga ochiq.
 */
export async function GET() {
  try {
    // Ro'yxat deyarli o'zgarmaydi - CDN 10 daqiqa keshlaydi.
    return NextResponse.json({ packs: await publicStickerPacks() }, { headers: publicCacheHeaders(600) });
  } catch {
    return NextResponse.json({ packs: [] });
  }
}
