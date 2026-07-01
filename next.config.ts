import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

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
