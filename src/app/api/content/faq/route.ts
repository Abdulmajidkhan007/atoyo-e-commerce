import { NextResponse } from "next/server";
import { getPublicFaq } from "@/lib/content/faq-server";
import { localizeFaq } from "@/lib/content/faq";
import { publicCacheHeaders } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SAVOL-JAVOB (ilova uchun). Saytdagi `/savol-javob` bilan bir xil
 * ro'yxat: admin saqlagani, aks holda sozlamadan yasalgan standart.
 * Javob hammaga bir xil (til so'rovda), shuning uchun CDN 5 daqiqa
 * keshlaydi. Faqat `{ question, answer }` chiqadi.
 */
export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") === "ru" ? "ru" : "uz";
  const items = localizeFaq(await getPublicFaq(), locale);
  return NextResponse.json({ items }, { headers: publicCacheHeaders(300) });
}
