import { NextResponse } from "next/server";
import { getTvPayload } from "@/lib/tv/slides";
import { DEFAULT_TV_SETTINGS } from "@/types/tv";
import { publicCacheHeaders } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DO'KONDAGI TELEVIZOR uchun ochiq yo'l - `/tv` sahifasi shuni
 * so'raydi (har necha daqiqada bir marta). Autentifikatsiya yo'q:
 * ichida faqat katalogda allaqachon ochiq turgan ma'lumot bor va
 * narx DONA narx (optom narx bu yerga chiqmaydi).
 */
export async function GET() {
  try {
    // Slaydlar hammaga bir xil (rasmsiz, narx dona) - CDN 2 daqiqa keshlaydi.
    return NextResponse.json(await getTvPayload(), { headers: publicCacheHeaders(120) });
  } catch (error) {
    console.error("TV ma'lumotini olishda xato:", error);
    // Ekran qora bo'lib qolmasin.
    return NextResponse.json({ settings: DEFAULT_TV_SETTINGS, slides: [] });
  }
}
