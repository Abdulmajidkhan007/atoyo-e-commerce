import { NextResponse } from "next/server";
import { loadTestimonials } from "@/lib/reviews/testimonials";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { publicCacheHeaders } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "MIJOZLAR FIKRI" (ilova uchun) — faqat admin tanlagan HAQIQIY sharhlar.
 *
 * `pickTestimonials()` ko'rinishi: `userId` va to'liq familiya YO'Q
 * (ism "Abdulla K."), narx YO'Q. Admin sozlamada o'chirgan bo'lsa
 * (`showTestimonials === false`) bo'sh ro'yxat — ilova bo'limni chizmaydi.
 */
export async function GET() {
  const settings = await getSiteSettings();
  const testimonials = settings.showTestimonials === false ? [] : await loadTestimonials();
  return NextResponse.json(
    {
      testimonials: testimonials.map((t) => ({
        id: t.id,
        authorName: t.authorName,
        rating: t.rating,
        comment: t.comment,
        productId: t.productId,
        productName: t.productName,
        createdAt: t.createdAt,
      })),
    },
    { headers: publicCacheHeaders(300) }
  );
}
