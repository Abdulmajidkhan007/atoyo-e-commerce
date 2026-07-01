import { NextResponse, type NextRequest } from "next/server";
import { verifyFirebaseIdTokenAtEdge } from "@/lib/auth/edge-verify";

/**
 * XAVFSIZLIK ESLATMASI (middleware bypass zaifliklari, masalan
 * CVE-2025-29927 klassidagi hujumlar haqida):
 *
 * O'sha zaiflik middleware'ni "x-middleware-subrequest" kabi ichki
 * so'rov headerlarini soxtalashtirish orqali butunlay chetlab o'tishga
 * imkon bergan edi. Bunga qarshi ikki qatlamli himoya qo'llaniladi:
 *
 *   1) Next.js frameworkning eng so'nggi patch qilingan versiyasi
 *      ishlatiladi (package.json'da qattiq belgilangan) - middleware
 *      bypass framework darajasida tuzatiladi.
 *   2) DEFENSE IN DEPTH (asosiy chegara): `/admin` ostidagi har bir
 *      sahifa ham mustaqil ravishda himoyalangan.
 *      `src/app/admin/layout.tsx` Server Component ichida
 *      `getCurrentAppUser()` orqali token QAYTA tekshiriladi va rol
 *      Firestore'dan LIVE o'qiladi. Middleware qandaydir yo'l bilan
 *      chetlab o'tilsa ham (masalan yamalmagan/eski Next.js versiyasida),
 *      /admin sahifalarining o'zi admin bo'lmagan foydalanuvchini
 *      serverda rad etadi - hech qachon faqat middleware'ga
 *      ("tashqi qopqoq"ga) ishonib qolinmaydi.
 *
 * Middleware Edge runtime'da ishlaydi (Next.js standart middleware
 * muhiti), shuning uchun Node.js'ga bog'liq Firebase Admin SDK bu yerda
 * ISHLATILMAYDI. Buning o'rniga ID tokenning haqiqiyligi `jose`
 * kutubxonasi bilan Google'ning ochiq JWKS kaliti orqali kriptografik
 * tekshiriladi (`lib/auth/edge-verify.ts`). Bu FAQAT "token soxta emasmi"
 * degan tezkor, arzon filtrni ta'minlaydi; Firestore'dagi haqiqiy
 * `role: 'admin'` tekshiruvi yuqorida aytilganidek doim Node.js
 * runtime'dagi layout'da amalga oshadi.
 */

const SESSION_COOKIE_NAME = "__session";

export const config = {
  matcher: ["/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const homeUrl = new URL("/", request.url);
  const idToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!idToken || !projectId) {
    return NextResponse.redirect(homeUrl);
  }

  const verified = await verifyFirebaseIdTokenAtEdge(idToken, projectId);

  if (!verified) {
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}
