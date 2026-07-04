import { NextResponse, type NextRequest } from "next/server";

/**
 * XAVFSIZLIK ARXITEKTURASI (/admin himoyasi ikki qatlamda):
 *
 *   1) Bu Proxy - TEZKOR, arzon "birinchi to'siq": session cookie umuman
 *      bo'lmagan (ya'ni tizimga kirmagan) foydalanuvchini darhol bosh
 *      sahifaga qaytaradi.
 *   2) ASOSIY (majburiy) chegara - `src/app/admin/layout.tsx`: u Node.js
 *      runtime'da Firebase Admin SDK bilan session cookie'ni kriptografik
 *      TASDIQLAYDI va Firestore'dan `role: 'admin'` ni LIVE o'qiydi.
 *      Cookie soxta/eskirgan yoki rol admin bo'lmasa - o'sha yerda rad
 *      etiladi. Shu tufayli middleware-bypass sinfidagi zaifliklar
 *      (masalan CVE-2025-29927) /adminni ocholmaydi: proxy chetlab
 *      o'tilsa ham layout tekshiruvi turibdi.
 *
 * MUHIM CHEKLOV (nega bu yerda Firebase Admin SDK YO'Q): Next.js 16'ning
 * o'zida Proxy Node.js runtime'da ishlaydi, LEKIN Netlify'ning Next.js
 * adapteri (@netlify/plugin-nextjs) proxy/middleware'ni Deno asosidagi
 * Edge Function sifatida joylashtiradi. firebase-admin Node API'lariga
 * bog'liq bo'lgani uchun u Edge'da yuklanmaydi va butun /admin yo'nalishi
 * "nextHandler is not a function" xatosi bilan yiqilar edi. Shuning uchun
 * bu qatlam ATAYLAB faqat cookie mavjudligini tekshiradi - to'liq
 * kriptografik tekshiruv yuqoridagi 2-qatlamda amalga oshadi.
 */

const SESSION_COOKIE_NAME = "__session";

export const config = {
  matcher: ["/admin/:path*"],
};

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}
