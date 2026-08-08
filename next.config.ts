import type { NextConfig } from "next";

/**
 * FIREBASE APP HOSTING'da client SDK sozlamalari.
 *
 * App Hosting build muhitiga `FIREBASE_WEBAPP_CONFIG` degan o'zgaruvchini
 * O'ZI qo'shib beradi (ichida apiKey, authDomain, projectId... bor).
 * Uni build vaqtida o'qib, `NEXT_PUBLIC_FIREBASE_*` sifatida kodga
 * joylaymiz - shunda `apphosting.yaml` ga kalitlarni qo'lda ko'chirish
 * shart bo'lmaydi.
 *
 * Boshqa hostinglarda (Netlify, lokal) avvalgidek `.env` dagi
 * `NEXT_PUBLIC_FIREBASE_*` ishlatiladi - ular ustunroq turadi.
 */
function firebaseWebappEnv(): Record<string, string> {
  let config: Record<string, string> = {};
  try {
    const raw = process.env.FIREBASE_WEBAPP_CONFIG;
    if (raw) config = JSON.parse(raw) as Record<string, string>;
  } catch {
    // Format buzilgan bo'lsa - jimgina o'tkazib yuboramiz.
  }

  const pick = (envName: string, key: string): Record<string, string> => {
    const value = process.env[envName] ?? config[key];
    return value ? { [envName]: value } : {};
  };

  return {
    ...pick("NEXT_PUBLIC_FIREBASE_API_KEY", "apiKey"),
    ...pick("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "authDomain"),
    ...pick("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "projectId"),
    ...pick("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "storageBucket"),
    ...pick("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "messagingSenderId"),
    ...pick("NEXT_PUBLIC_FIREBASE_APP_ID", "appId"),
  };
}

/**
 * CONTENT SECURITY POLICY.
 *
 * Sayt qaysi manbadan skript/rasm/ulanish olishi mumkinligini
 * brauzerga aytadi — XSS bo'lganda ham begona domenga ma'lumot
 * ketishini to'sadi.
 *
 * Ataylab yumshoq qo'yilgan joylar (busiz sayt ishlamaydi):
 *   • `'unsafe-inline'` (style) — MUI/emotion uslublarni inline
 *     `<style>` sifatida joylashtiradi, `nonce`siz boshqa yo'l yo'q.
 *   • `'unsafe-inline'` (script) — root layout'dagi tema skripti va
 *     Next.js'ning hydration ma'lumotlari inline keladi.
 *   • `'unsafe-eval'` — ishlab chiqish rejimida (`next dev`) React
 *     Fast Refresh talab qiladi; productionda qo'shilmaydi.
 *
 * Ruxsat berilgan tashqi manbalar: Firebase (auth/firestore/storage),
 * Google hisob rasmi, Google Analytics va Telegram login vidjeti.
 */
function contentSecurityPolicy(): string {
  const dev = process.env.NODE_ENV === "development";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(dev ? ["'unsafe-eval'"] : []),
      "https://www.googletagmanager.com",
      "https://apis.google.com",
      "https://telegram.org",
      "https://*.telegram.org",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://*.googleapis.com",
      "https://*.google.com",
      "https://*.firebaseio.com",
      "https://*.cloudfunctions.net",
      "https://www.google-analytics.com",
      ...(dev ? ["ws://localhost:*", "http://localhost:*"] : []),
    ],
    // Firebase auth popup'i va Telegram login vidjeti iframe ochadi.
    "frame-src": ["'self'", "https://*.firebaseapp.com", "https://oauth.telegram.org"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  env: firebaseWebappEnv(),

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  // Server Actions uchun ruxsat etilgan originlar ro'yxati aniq belgilanadi.
  // Bu CSRF/host-header ekspluatatsiyasidan (masalan CVE-2025-29927 uslubidagi
  // middleware/Server Action bypass hujumlaridan) himoyalanish uchun zarur.
  experimental: {
    serverActions: {
      allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "localhost:3000").split(","),
    },
  },

  // ESLATMA (Partial Prerendering / Cache Components): Next.js 16'da PPR
  // `cacheComponents: true` orqali yoqiladi. Bu bayroq hali ATAYLAB
  // o'chirilgan - u har bir dinamik ma'lumot (cookies(), foydalanuvchiga
  // xos so'rovlar) atrofida to'g'ri `<Suspense>` chegaralarini talab
  // qiladi. Katalog/mahsulot sahifalari UI bosqichida qurilib,
  // Suspense chegaralari joyiga qo'yilgach, shu yerda
  // `cacheComponents: true` qilib yoqiladi - hozir yoqilsa, hali
  // Suspense bilan o'ralmagan dinamik sahifalar (savat, profil, admin)
  // build vaqtida xato beradi.
  // cacheComponents: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
