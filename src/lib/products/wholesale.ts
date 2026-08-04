import type { Product, ProductVariant } from "@/types/product";
import type { UserRole } from "@/types/user";

/**
 * OPTOM VA DONA NARX.
 *
 * Bazadagi `price` - OPTOM narx (admin faqat shuni kiritadi). Dona
 * (chakana) narx undan foiz qo'shib hisoblanadi:
 *
 *     dona = optom × (1 + ustama% / 100)
 *
 * Ustama sozlamalarda turadi (standart 5%) va kerak bo'lsa alohida
 * mahsulotga boshqacha qo'yiladi (`retailMarkupPercent`). Ya'ni narx
 * ko'tarilib-tushganda hamma mahsulotni qayta yozish shart emas -
 * bitta foizni o'zgartirish yetadi.
 *
 * Kim qaysi narxni ko'radi:
 *   • `client` (optom mijoz) - optom narx;
 *   • qolganlar - dona narx.
 *
 * Client ham, server ham ishlatadi - "server-only" YO'Q.
 */

/** Sozlamada ustama ko'rsatilmagan bo'lsa. */
export const DEFAULT_RETAIL_MARKUP = 5;

export interface PricingSettings {
  /** Dona narxga qo'shiladigan ustama, foizda. */
  retailMarkupPercent: number;
  /** Buyurtmaning eng kam summasi (so'm). 0 - cheklov yo'q. */
  minOrderAmount: number;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  retailMarkupPercent: DEFAULT_RETAIL_MARKUP,
  minOrderAmount: 100_000,
};

/** Optom mijozmi (optom narxni ko'radi). */
export function isWholesaleRole(role: UserRole | undefined): boolean {
  return role === "client";
}

/**
 * Optom narxdan dona narx. Natija 100 so'mgacha yaxlitlanadi -
 * "115 500" kabi chiroyli raqam chiqadi, "115 497" emas.
 */
export function retailFromWholesale(wholesale: number, markupPercent: number): number {
  if (!Number.isFinite(wholesale) || wholesale <= 0) return 0;
  const percent = Number.isFinite(markupPercent) ? markupPercent : DEFAULT_RETAIL_MARKUP;
  return Math.round((wholesale * (1 + percent / 100)) / 100) * 100;
}

/** Shu mahsulotga tegishli ustama (alohida qo'yilgani bo'lsa - o'sha). */
export function markupFor(
  product: Pick<Product, "retailMarkupPercent">,
  settings: Pick<PricingSettings, "retailMarkupPercent">
): number {
  const own = product.retailMarkupPercent;
  return typeof own === "number" && own >= 0 ? own : settings.retailMarkupPercent;
}

/** Rolga qarab ko'rsatiladigan narx (bazadagi qiymat - optom). */
export function priceForRole(
  wholesale: number,
  role: UserRole | undefined,
  markupPercent: number
): number {
  return isWholesaleRole(role) ? wholesale : retailFromWholesale(wholesale, markupPercent);
}

/** Mahsulotning rolga mos narxlari (chegirma ham shu qoidaga bo'ysunadi). */
export function productPricesForRole(
  product: Pick<Product, "price" | "discountPrice" | "discountUntil" | "retailMarkupPercent">,
  role: UserRole | undefined,
  settings: Pick<PricingSettings, "retailMarkupPercent">
): { price: number; discountPrice: number | null } {
  const markup = markupFor(product, settings);
  return {
    price: priceForRole(product.price, role, markup),
    discountPrice:
      product.discountPrice && product.discountPrice > 0
        ? priceForRole(product.discountPrice, role, markup)
        : null,
  };
}

/** Turning (variant) rolga mos narxi. */
export function variantPriceForRole(
  variant: Pick<ProductVariant, "price" | "discountPrice">,
  role: UserRole | undefined,
  markupPercent: number
): { price: number; discountPrice: number | null } {
  return {
    price: priceForRole(variant.price, role, markupPercent),
    discountPrice:
      variant.discountPrice && variant.discountPrice > 0
        ? priceForRole(variant.discountPrice, role, markupPercent)
        : null,
  };
}
