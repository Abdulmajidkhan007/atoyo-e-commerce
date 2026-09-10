import type { MetadataRoute } from "next";
import { getAdminDb } from "@/lib/firebase/admin";
import { getPublishedPosts } from "@/lib/firebase/admin-content";
import type { Product } from "@/types/product";

/**
 * Soatiga bir marta qayta yasaladi. ILGARI `force-dynamic` turgan edi
 * va u `revalidate` ni bekor qilardi: har robot so'roviga minglab
 * hujjat qayta o'qilardi.
 */
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo.uz";

/** Google bitta xaritada 50 000 URL gacha qabul qiladi. */
const MAX_PRODUCTS = 20000;

/**
 * Qidiruv tizimlari uchun sayt xaritasi: statik sahifalar + faol
 * mahsulotlar + chop etilgan blog maqolalari. Firestore o'qishda xato
 * bo'lsa ham kamida statik sahifalar qaytadi.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/katalog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/kontakt`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/optom`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/maxfiylik`, changeFrequency: "yearly", priority: 0.2 },
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
    productPages = snap.docs.map((doc) => {
      const p = doc.data() as Pick<Product, "updatedAt">;
      return {
        url: `${SITE_URL}/mahsulot/${doc.id}`,
        lastModified: new Date(p.updatedAt ?? Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    });
  } catch (error) {
    console.error("Sitemap: mahsulotlarni o'qishda xato:", error);
  }

  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const posts = await getPublishedPosts(100);
    blogPages = posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error("Sitemap: bloglarni o'qishda xato:", error);
  }

  return [...staticPages, ...productPages, ...blogPages];
}
