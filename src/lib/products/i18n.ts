import type { Locale } from "@/lib/i18n/config";
import type { Product } from "@/types/product";
import { publicDescription } from "./description";

/**
 * MAHSULOT MATNINING TILGA MOS VARIANTI.
 *
 * Tarjima kiritilmagan bo'lsa o'zbekchasi qaytadi - shuning uchun
 * eski mahsulotlar ham, tarjimasi yarim kiritilganlari ham to'g'ri
 * ko'rinadi. Client ham, server ham ishlatadi ("server-only" YO'Q).
 */
export function localizedName(
  product: Pick<Product, "name" | "nameRu" | "nameEn">,
  locale: Locale
): string {
  if (locale === "ru") return product.nameRu?.trim() || product.name;
  if (locale === "en") return product.nameEn?.trim() || product.name;
  return product.name;
}

/**
 * MIJOZGA ko'rinadigan tavsif. Ichki xizmat ma'lumoti (1C kodi)
 * bu yerda kesib tashlanadi - u faqat xodimlar uchun va admin
 * panelda tavsifning O'ZI to'liq ko'rinadi.
 */
export function localizedDescription(
  product: Pick<Product, "description" | "descriptionRu" | "descriptionEn">,
  locale: Locale
): string {
  if (locale === "ru") return publicDescription(product.descriptionRu?.trim() || product.description);
  if (locale === "en") return publicDescription(product.descriptionEn?.trim() || product.description);
  return publicDescription(product.description);
}

/** Qidiruv indeksiga tushadigan barcha nomlar (tarjimalari bilan). */
export function allNames(product: Pick<Product, "name" | "nameRu" | "nameEn">): string {
  return [product.name, product.nameRu, product.nameEn].filter(Boolean).join(" ");
}
