import {SITE_URL} from './api';

/**
 * BOSH SAHIFA VA KATALOG UCHUN OCHIQ API'LAR (A oqimi).
 *
 * Ikkalasi ham shaxsiy emas va narx/uid qaytarmaydi, shuning uchun
 * token yuborilmaydi. Xato bo'lsa bo'sh ro'yxat: chiplar va "Mijozlar
 * fikri" shunchaki ko'rinmaydi, ekran yiqilmaydi.
 */

export interface ChipCategory {
  slug: string;
  label: string;
}

export interface Testimonial {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  productId: string;
  productName: string;
  createdAt: number;
}

/** Faqat mahsuloti bor kategoriyalar (server 5 daqiqa keshlaydi). */
export async function fetchChipCategories(): Promise<ChipCategory[]> {
  try {
    const response = await fetch(`${SITE_URL}/api/products/chip-categories`);
    if (!response.ok) return [];
    const data = (await response.json()) as {categories?: ChipCategory[]};
    return data.categories ?? [];
  } catch {
    return [];
  }
}

/** Admin tanlagan HAQIQIY sharhlar; bo'sh bo'lsa bo'lim chizilmaydi. */
export async function fetchTestimonials(): Promise<Testimonial[]> {
  try {
    const response = await fetch(`${SITE_URL}/api/content/testimonials`);
    if (!response.ok) return [];
    const data = (await response.json()) as {testimonials?: Testimonial[]};
    return data.testimonials ?? [];
  } catch {
    return [];
  }
}
