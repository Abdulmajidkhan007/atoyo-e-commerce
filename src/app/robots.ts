import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.web.app";

/** Qidiruv robotlari uchun qoidalar: admin va API yopiq, qolgani ochiq. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // `/tv` - do'kondagi televizor ekrani, mijoz uchun emas.
      disallow: ["/admin", "/api/", "/profil", "/savat", "/buyurtma", "/tolov", "/tv"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
