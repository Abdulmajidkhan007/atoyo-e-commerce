import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, ipLimitKey } from "@/lib/rate-limit";
import { channelProductName, trackChannelClick } from "@/lib/telegram/channel-stats";

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

/** Bitta IP dan soatiga nechta bosilish sanaladi (oshgani FAQAT sanalmaydi). */
export const CLICK_IP_LIMIT = 120;
const HOUR_MS = 3_600_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Mahsulot bormi — yo'naltirishdan OLDIN: notanish/o'chirilgan ID
  // 404 sahifaga emas, bosh sahifaga ketadi (va hech narsa yozilmaydi).
  const name = await channelProductName(id);
  const target =
    name === null
      ? new URL("/", request.url)
      : new URL(`/mahsulot/${encodeURIComponent(id)}`, request.url);
  // Manba ko'rinib tursin (sayt analitikasi uchun ham qulay).
  target.searchParams.set("manba", "telegram");

  // Sanash yo'naltirishdan OLDIN va KUTILADI. `after()` da edi, lekin
  // App Hosting (Cloud Run) javobdan keyin CPU'ni cheklaydi — sanash
  // jimgina yo'qolishi mumkin edi (tekshiruvchi). Qo'shimcha kechikish
  // ~2 ta Firestore so'rovi. IP o'qilmasa limit QO'LLANMAYDI: aks holda
  // hamma "unknown" mijoz bitta umumiy 120 talik chelakka tushardi.
  if (name !== null) {
    const ip = getClientIp(request);
    const allowed =
      ip === "unknown"
        ? true
        : (
            await checkRateLimit({
              key: `channel-click:${ipLimitKey(ip)}`,
              limit: CLICK_IP_LIMIT,
              windowMs: HOUR_MS,
            }).catch(() => ({ allowed: true }))
          ).allowed;
    if (allowed) await trackChannelClick(id, name);
  }

  const response = NextResponse.redirect(target, 302);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}
