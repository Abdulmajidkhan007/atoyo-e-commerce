import type { Product } from "@/types/product";

/**
 * Chegirma hozir amal qiladimi. Chegirma narxi bo'lishi kifoya emas -
 * `discountUntil` (agar belgilangan bo'lsa) muddati ham o'tmagan bo'lishi
 * kerak. Client ham, server ham shu funksiyani ishlatadi.
 */
export function isDiscountActive(product: Pick<Product, "price" | "discountPrice" | "discountUntil">): boolean {
  const { price, discountPrice, discountUntil } = product;
  if (!discountPrice || discountPrice <= 0 || discountPrice >= price) return false;
  if (discountUntil && discountUntil < Date.now()) return false;
  return true;
}

/** Mahsulotning HOZIRGI haqiqiy narxi (chegirma amal qilsa - chegirma narxi). */
export function effectivePrice(product: Pick<Product, "price" | "discountPrice" | "discountUntil">): number {
  return isDiscountActive(product) ? product.discountPrice! : product.price;
}
