import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.netlify.app";

/** Qidiruv robotlari uchun qoidalar: admin va API yopiq, qolgani ochiq. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/profil", "/savat", "/buyurtma", "/tolov"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
