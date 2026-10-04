import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Review } from "@/types/review";
import { pickTestimonials, type Testimonial } from "./testimonial-view";

/**
 * BOSH SAHIFADAGI "MIJOZLAR FIKRI" — faqat admin tanlagan HAQIQIY
 * sharhlar (`reviews.featured == true`). 5 daqiqa kesh; admin belgini
 * o'zgartirsa `clearTestimonialsCache()`.
 */
const TTL = 5 * 60_000;
const SHOW = 9;
let cache: { value: Testimonial[]; at: number } | null = null;

export function clearTestimonialsCache(): void {
  cache = null;
}

type ProductInfo = { name: string; isActive?: boolean; isDraft?: boolean };

/** Mahsulot nomlari (faqat nom va ko'rinish — narx o'qilmaydi). */
async function productInfo(ids: string[]): Promise<Map<string, ProductInfo>> {
  const unique = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, ProductInfo>();
  if (unique.length === 0) return map;
  const db = getAdminDb();
  const snaps = await db.getAll(...unique.map((id) => db.collection("products").doc(id)), {
    fieldMask: ["name", "isActive", "isDraft"],
  });
  for (const snap of snaps) {
    if (snap.exists) map.set(snap.id, snap.data() as ProductInfo);
  }
  return map;
}

export async function loadTestimonials(): Promise<Testimonial[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  try {
    // Faqat tenglik — kompozit indeks kerak emas; saralash xotirada.
    const snap = await getAdminDb().collection("reviews").where("featured", "==", true).limit(50).get();
    const reviews = snap.docs.map((d) => ({ ...(d.data() as Review), id: d.id }));
    const value = pickTestimonials(reviews, await productInfo(reviews.map((r) => r.productId)), SHOW);
    cache = { value, at: Date.now() };
    return value;
  } catch (error) {
    console.error("Mijozlar fikrini o'qishda xato:", error);
    return [];
  }
}

export interface AdminReviewRow extends Review {
  productName: string;
}

/** Admin ro'yxati: oxirgi sharhlar + mahsulot nomi. */
export async function listRecentReviews(limit = 100): Promise<AdminReviewRow[]> {
  const snap = await getAdminDb().collection("reviews").orderBy("createdAt", "desc").limit(limit).get();
  const reviews = snap.docs.map((d) => ({ ...(d.data() as Review), id: d.id }));
  const products = await productInfo(reviews.map((r) => r.productId));
  return reviews.map((r) => ({
    ...r,
    productName: products.get(r.productId)?.name ?? "(mahsulot o'chirilgan)",
  }));
}

/** Belgini qo'yadi/oladi. Sharh yo'q bo'lsa `false`. */
export async function setReviewFeatured(id: string, featured: boolean): Promise<boolean> {
  const ref = getAdminDb().collection("reviews").doc(id);
  const ok = await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    tx.update(ref, { featured });
    return true;
  });
  clearTestimonialsCache();
  return ok;
}
