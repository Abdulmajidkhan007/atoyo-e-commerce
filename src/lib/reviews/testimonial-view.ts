import type { Review } from "@/types/review";

/**
 * "MIJOZLAR FIKRI" — sof mantiq (testi `testimonial-view.test.ts`).
 *
 * Mijozga faqat shu ko'rinish chiqadi: `userId` (Firebase uid yoki
 * `tg:<id>`) va to'liq familiya CHIQMAYDI.
 */
export interface Testimonial {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  productId: string;
  productName: string;
  createdAt: number;
}

/** "Abdulla Karimov" → "Abdulla K."; bo'sh → "Mijoz". */
export function shortAuthorName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Mijoz";
  const first = parts[0]!.slice(0, 30);
  const last = parts[1];
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}

/**
 * Tanlangan sharhlardan saytga chiqadiganlarini yig'adi: mahsuloti
 * o'chirilgan, yashirilgan yoki chernovik bo'lsa — sharh ham chiqmaydi
 * (mijoz bosib bo'sh sahifaga tushmasin). Eng yangisi birinchi.
 */
export function pickTestimonials(
  reviews: Review[],
  products: Map<string, { name: string; isActive?: boolean; isDraft?: boolean }>,
  limit: number
): Testimonial[] {
  return reviews
    .filter((r) => r.featured === true && r.comment.trim().length > 0)
    .filter((r) => {
      const p = products.get(r.productId);
      return Boolean(p && p.isActive !== false && p.isDraft !== true);
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      authorName: shortAuthorName(r.authorName),
      rating: Math.min(5, Math.max(1, Math.round(r.rating))),
      comment: r.comment.trim(),
      productId: r.productId,
      productName: products.get(r.productId)!.name,
      createdAt: r.createdAt,
    }));
}
