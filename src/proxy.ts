import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";

/**
 * XAVFSIZLIK ESLATMASI (middleware/proxy bypass zaifliklari, masalan
 * CVE-2025-29927 klassidagi hujumlar haqida):
 *
 * O'sha zaiflik middleware'ni "x-middleware-subrequest" kabi ichki
 * so'rov headerlarini soxtalashtirish orqali butunlay chetlab o'tishga
 * imkon bergan edi. Next.js v16'da bu fayl konvensiyasi "middleware"dan
 * "proxy"ga o'zgartirildi va Proxy endi STANDART HOLATDA Node.js
 * runtime'da ishlaydi (Edge emas) - shu tufayli Firebase Admin SDK'ni
 * (Node.js API'lariga bog'liq) bu yerda to'g'ridan-to'g'ri, xavfsiz
 * ishlatish mumkin.
 *
 * Bunga qarshi baribir ikki qatlamli himoya saqlanadi (Next.js'ning
 * o'z hujjatlaridagi tavsiyasiga ko'ra: "A page-level authentication
 * check does not extend to the Server Actions/Route Handlers defined
 * within it. Always re-verify inside the action"):
 *
 *   1) Bu Proxy /admin/* uchun TEZKOR, session-darajasidagi to'siq:
 *      cookie'ni tasdiqlaydi va Firestore'dan `role` maydonini LIVE
 *      o'qiydi.
 *   2) `src/app/admin/layout.tsx` Server Component ichida
 *      `getCurrentAppUser()` orqali xuddi shu tekshiruv MUSTAQIL
 *      ravishda QAYTA amalga oshiriladi. Proxy qandaydir yo'l bilan
 *      chetlab o'tilsa ham (masalan yamalmagan/eski Next.js
 *      versiyasida yoki boshqa deploy muhitida Edge runtime'ga
 *      tushirilgan bo'lsa), /admin sahifalarining o'zi admin
 *      bo'lmagan foydalanuvchini serverda rad etadi.
 */

export const config = {
  matcher: ["/admin/:path*"],
};

export async function proxy(request: NextRequest) {
  const homeUrl = new URL("/", request.url);
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(homeUrl);
  }

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true /* checkRevoked */);
    const userDoc = await getAdminDb().collection("users").doc(decoded.uid).get();

    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
  } catch {
    // Cookie yaroqsiz, muddati o'tgan yoki bekor qilingan - xatoni
    // fosh qilmasdan jim tarzda bosh sahifaga yo'naltiramiz.
    return NextResponse.redirect(homeUrl);
  }
}
