import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "@/lib/http/csp";
import { stripLocalePrefix } from "@/lib/i18n/href";
import { DEFAULT_LOCALE, LOCALE_HEADER } from "@/lib/i18n/config";

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

/**
 * Bu bo'limlarga `/ru` prefiksi TEGMAYDI — admin faqat o'zbekcha
 * (`CLAUDE.md` 13-band), API/klik/TV sahifa manzillari esa til
 * tushunchasiga umuman ega emas. `/ru/admin/...` kabi so'rov shunchaki
 * mos sahifa topmay 404 qaytaradi (rewrite qilinmaydi).
 */
const NON_LOCALIZED_PREFIXES = ["/admin", "/api", "/k", "/tv"];

function isNonLocalizedPath(path: string): boolean {
  return NON_LOCALIZED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export const config = {
  /**
   * HAMMA sahifa: CSP nonce har so'rovga yangi yasaladi. Statik
   * fayllar (`_next/static`, rasm, favicon) chetda - ular HTML emas
   * va ularga CSP kerak emas, ortiqcha ishlov esa har so'rovga
   * qo'shilardi.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.jpg|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|mp4|webm|txt|xml)$).*)"],
};

export function proxy(request: NextRequest) {
  // Har so'rovga bir martalik nonce. `crypto` — Web Crypto API,
  // Edge runtime'da ham bor (Node'ning `crypto` moduli emas).
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(undefined, nonce);

  const isAdmin = request.nextUrl.pathname.startsWith("/admin");
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (isAdmin && !sessionCookie) {
    // ILGARI bosh sahifaga tashlanardi va foydalanuvchi NIMA
    // bo'lganini bilmasdi: "havola ishlamadi" deb o'ylardi. Endi
    // kirish sahifasiga, qaytish manzili bilan boradi - kirgach
    // o'zi so'ragan bo'limga tushadi.
    return NextResponse.redirect(loginUrl(request.nextUrl.pathname, request.url, "login"));
  }

  // TIL: `/ru/katalog` kabi manzil ICHKI ravishda `/katalog` ga
  // yo'naltiriladi (brauzer manzil qatori o'zgarmaydi) - sahifa kodi
  // TAKRORLANMAYDI, faqat `x-locale` sarlavhasi orqali qaysi tilda
  // chizish kerakligi uzatiladi (`lib/i18n/server.ts` shundan o'qiydi).
  const { locale: urlLocale, path: routedPath } = stripLocalePrefix(request.nextUrl.pathname);
  const shouldRouteLocale = urlLocale !== DEFAULT_LOCALE && !isNonLocalizedPath(routedPath);
  const locale = shouldRouteLocale ? urlLocale : DEFAULT_LOCALE;

  const headers = new Headers(request.headers);
  // Layout `redirect(...)` da qaysi bo'limga kirmoqchi bo'lganini
  // bilishi uchun yo'lni sarlavhada uzatamiz (Next.js server
  // komponentga so'rov yo'lini bermaydi).
  headers.set("x-invoked-path", request.nextUrl.pathname);
  headers.set(LOCALE_HEADER, locale);
  // Nonce ikki joyga qo'yiladi:
  //   • `x-nonce` — bizning layout uni o'qib inline skriptlarga beradi;
  //   • CSP SO'ROV sarlavhasida — Next.js uni o'zi o'qib O'ZINING
  //     inline skriptlariga (hydration ma'lumotlari) qo'yadi.
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);

  let response: NextResponse;
  if (shouldRouteLocale) {
    const url = request.nextUrl.clone();
    url.pathname = routedPath;
    response = NextResponse.rewrite(url, { request: { headers } });
  } else {
    response = NextResponse.next({ request: { headers } });
  }
  response.headers.set("content-security-policy", csp);
  return response;
}

/**
 * Kirish sahifasiga qaytish manzili bilan yo'naltirish.
 *
 * `next` faqat ICHKI yo'l bo'lishi mumkin (`/` bilan boshlanadi va
 * `//` emas) - aks holda ochiq yo'naltirish (open redirect) zaifligi
 * paydo bo'ladi: `?redirect=https://saxta.uz` bilan mijozni begona
 * saytga olib chiqib ketish mumkin edi.
 */
export function loginUrl(next: string, base: string, reason: "login" | "forbidden"): URL {
  const url = new URL("/kirish", base);
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  url.searchParams.set("redirect", safeNext);
  url.searchParams.set("reason", reason);
  return url;
}
