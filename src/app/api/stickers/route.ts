import { NextResponse } from "next/server";
import { publicStickerPacks } from "@/lib/telegram/stickers";

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
    return NextResponse.json({ packs: await publicStickerPacks() });
  } catch {
    return NextResponse.json({ packs: [] });
  }
}
