import { NextResponse } from "next/server";
import { trackChannelClick } from "@/lib/telegram/channel-stats";

/**
 * KANAL POSTIDAGI "🛒 Saytda ko'rish" HAVOLASI.
 *
 * Telegram post ostidagi tugma shu yo'lga qaraydi: bosilish sanaladi,
 * so'ng mijoz mahsulot sahifasiga yo'naltiriladi. Mijoz uchun farqi
 * sezilmaydi, admin esa qaysi post ishlayotganini ko'radi
 * (`/kanal` buyrug'i yoki postni adminlar guruhiga forward qilish).
 *
 * Nega alohida qisqa yo'l (`/k/...`): Telegram tugmasidagi manzil
 * postda ko'rinmaydi, lekin havola nusxa olinsa qisqa bo'lgani
 * chiroyli va `/mahsulot/...` yo'liga tegmaydi (u SEO uchun
 * indekslanadi, bu esa yo'q - `noindex` bilan).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const target = new URL(`/mahsulot/${encodeURIComponent(id)}`, request.url);
  // Manba ko'rinib tursin (sayt analitikasi uchun ham qulay).
  target.searchParams.set("manba", "telegram");

  // Sanash `await` bilan kutiladi (redirect'dan oldin) — shuning uchun
  // mijozni ozgina kutdiradi, lekin yiqilsa ham yo'naltirish ishlaydi.
  await trackChannelClick(id);

  const response = NextResponse.redirect(target, 302);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}
