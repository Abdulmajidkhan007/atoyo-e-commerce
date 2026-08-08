/**
 * CONTENT SECURITY POLICY.
 *
 * Sayt qaysi manbadan skript/rasm/video olishi mumkinligini brauzerga
 * aytadi — XSS bo'lganda ham begona domenga ma'lumot ketishini to'sadi.
 *
 * MUHIM DARS (bir marta yiqilgan joy): CSP'da ko'rsatilmagan tur
 * `default-src` ga tushadi. `default-src 'self'` bo'lgani uchun
 * `media-src` yozilmaganda mahsulot VIDEOSI (Firebase Storage'dan
 * keladi) jimgina bloklangan — pleyer chizilgan, lekin fayl
 * yuklanmagan. Shuning uchun quyida mijozga ko'rinadigan HAR BIR tur
 * ochiq yozilgan; yangi tashqi manba qo'shilsa shu ro'yxat
 * yangilanadi va `csp.test.ts` ga tekshiruv qo'shiladi.
 *
 * Ataylab yumshoq qo'yilgan joylar (busiz sayt ishlamaydi):
 *   • `'unsafe-inline'` (style) — MUI/emotion uslublarni inline
 *     `<style>` sifatida joylashtiradi, `nonce`siz boshqa yo'l yo'q.
 *   • `'unsafe-inline'` (script) — root layout'dagi tema skripti va
 *     Next.js'ning hydration ma'lumotlari inline keladi.
 *   • `'unsafe-eval'` — faqat ishlab chiqish rejimida (React Fast
 *     Refresh talab qiladi); productionda qo'shilmaydi.
 *   • `img-src` / `media-src` da `https:` — mahsulot rasm va
 *     videolari Firebase Storage'da, avatarlar Google'da; ro'yxatni
 *     domen bo'yicha qotirib qo'yish har yangi manbada saytni
 *     buzardi.
 */
export function contentSecurityPolicy(isDev = process.env.NODE_ENV === "development"): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://www.googletagmanager.com",
      "https://apis.google.com",
      // Firebase Auth (telefon orqali kirish) reCAPTCHA'ni shu
      // yerdan yuklaydi.
      "https://www.gstatic.com",
      "https://www.google.com",
      "https://telegram.org",
      "https://*.telegram.org",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    // MAHSULOT VIDEOSI (Firebase Storage) va bot yuborgan qisqa
    // videolar. Busiz `default-src` ishlab, video yuklanmaydi.
    "media-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://*.googleapis.com",
      "https://*.google.com",
      "https://*.gstatic.com",
      "https://*.firebaseio.com",
      "https://*.cloudfunctions.net",
      "https://www.google-analytics.com",
      ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
    ],
    // Firebase auth popup'i, reCAPTCHA va Telegram login vidjeti
    // iframe ochadi.
    "frame-src": [
      "'self'",
      "https://*.firebaseapp.com",
      "https://accounts.google.com",
      "https://apis.google.com",
      "https://www.google.com",
      "https://oauth.telegram.org",
    ],
    // Next.js va Firebase ba'zi ishlarni blob worker'da bajaradi.
    "worker-src": ["'self'", "blob:"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}
