import type { MetadataRoute } from "next";
import { getAdminDb } from "@/lib/firebase/admin";
import { getPublishedPosts } from "@/lib/firebase/admin-content";
import type { Product } from "@/types/product";
import { ROUTED_LOCALES } from "@/lib/i18n/config";
import { localeHref } from "@/lib/i18n/href";

/**
 * Soatiga bir marta qayta yasaladi. ILGARI `force-dynamic` turgan edi
 * va u `revalidate` ni bekor qilardi: har robot so'roviga minglab
 * hujjat qayta o'qilardi.
 */
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo.uz";

/** Google bitta xaritada 50 000 URL gacha qabul qiladi. */
const MAX_PRODUCTS = 20000;

type SitemapEntry = MetadataRoute.Sitemap[number];

/**
 * Bitta mantiqiy (o'zbekcha, prefiks'siz) yo'ldan HAR BIR ULANGAN til
 * uchun alohida sitemap yozuvi yasaydi (`/katalog` va `/ru/katalog`) -
 * ikkalasi ham bir-biriga `hreflang` bilan bog'lanadi, shunda Google
 * ularni dublikat emas, bir-birining tarjimasi deb tushunadi.
 */
function localizedEntries(
  logicalPath: string,
  rest: Omit<SitemapEntry, "url" | "alternates">
): SitemapEntry[] {
  const languages: Record<string, string> = {};
  for (const l of ROUTED_LOCALES) languages[l] = `${SITE_URL}${localeHref(logicalPath, l)}`;
  languages["x-default"] = `${SITE_URL}${logicalPath}`;

  return ROUTED_LOCALES.map((locale) => ({
    ...rest,
    url: `${SITE_URL}${localeHref(logicalPath, locale)}`,
    alternates: { languages },
  }));
}

/**
 * Qidiruv tizimlari uchun sayt xaritasi: statik sahifalar + faol
 * mahsulotlar + chop etilgan blog maqolalari. Firestore o'qishda xato
 * bo'lsa ham kamida statik sahifalar qaytadi.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    ...localizedEntries("/", { changeFrequency: "daily", priority: 1 }),
    ...localizedEntries("/katalog", { changeFrequency: "daily", priority: 0.9 }),
    ...localizedEntries("/blog", { changeFrequency: "weekly", priority: 0.7 }),
    ...localizedEntries("/about", { changeFrequency: "monthly", priority: 0.5 }),
    ...localizedEntries("/kontakt", { changeFrequency: "monthly", priority: 0.5 }),
    ...localizedEntries("/optom", { changeFrequency: "monthly", priority: 0.4 }),
    ...localizedEntries("/maxfiylik", { changeFrequency: "yearly", priority: 0.2 }),
  ];

  let productPages: MetadataRoute.Sitemap = [];
  try {
    // `select` — xaritaga faqat sana kerak, butun hujjatni tortish
    // (rasm havolalari, tavsif) behuda trafik va xotira.
    const snap = await getAdminDb()
      .collection("products")
      .where("isActive", "==", true)
      .select("updatedAt")
      .limit(MAX_PRODUCTS)
      .get();
    productPages = snap.docs.flatMap((doc) => {
      const p = doc.data() as Pick<Product, "updatedAt">;
      return localizedEntries(`/mahsulot/${doc.id}`, {
        lastModified: new Date(p.updatedAt ?? Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      });
    });
  } catch (error) {
    console.error("Sitemap: mahsulotlarni o'qishda xato:", error);
  }

  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const posts = await getPublishedPosts(100);
    blogPages = posts.flatMap((post) =>
      localizedEntries(`/blog/${post.slug}`, {
        lastModified: new Date(post.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })
    );
  } catch (error) {
    console.error("Sitemap: bloglarni o'qishda xato:", error);
  }

  return [...staticPages, ...productPages, ...blogPages];
}
