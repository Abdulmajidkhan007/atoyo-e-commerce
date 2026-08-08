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
 * MUHIM CHEKLOV (nega bu yerda Firebase Admin SDK YO'Q): bu fayl
 * ATAYLAB "edge-safe" - firebase-admin import QILINMAYDI. Sabab ikkita:
 *
 *   • Proxy HAR BIR /admin so'roviga qo'shiladi. firebase-admin og'ir
 *     paket - uni bu yerga tortish har so'rovga sovuq start qo'shadi,
 *     holbuki bu qatlam faqat "cookie bormi?" degan tez tekshiruv.
 *   • Proxy'ni Edge runtime'da ishlatadigan hostinglar bor (masalan
 *     Netlify adapteri uni Deno Edge Function qilib joylashtiradi).
 *     firebase-admin Node API'lariga bog'liq va u yerda yuklanmaydi -
 *     butun /admin "nextHandler is not a function" bilan yiqilardi.
 *     Firebase App Hosting'da bunday cheklov yo'q, lekin qoidani
 *     saqlaymiz: zaxira hosting variantini yopib qo'ymaydi.
 *
 * To'liq kriptografik tekshiruv yuqoridagi 2-qatlamda amalga oshadi.
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
