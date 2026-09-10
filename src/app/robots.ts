import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo.uz";

/** Qidiruv robotlari uchun qoidalar: admin va API yopiq, qolgani ochiq. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // `/tv` - do'kondagi televizor ekrani, mijoz uchun emas.
      disallow: [
        "/admin",
        "/api/",
        "/profil",
        "/savat",
        "/buyurtma",
        "/tolov",
        "/chek",
        "/sevimlilar",
        "/kirish",
        "/auth",
        "/tv",
        // `/k/<id>` — kanal tugmasi uchun hisoblagich, u mahsulotga
        // yo'naltiradi. Indekslansa katalogda ikki nusxa paydo bo'ladi.
        "/k/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
