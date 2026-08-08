import type { Product, ProductVariant } from "@/types/product";
import type { UserRole } from "@/types/user";
import { isDiscountActive } from "./pricing";
import { isWholesaleRole, markupFor, priceForRole, type PricingSettings } from "./wholesale";

/**
 * MAHSULOTNI MIJOZGA BERISHDAN OLDIN TOZALASH.
 *
 * Bazadagi `price` — OPTOM narx, `costPrice` — TANNARX. Ilgari
 * mijozning brauzeri mahsulot hujjatini Firestore'dan TO'G'RIDAN-TO'G'RI
 * o'qirdi, ya'ni optom narx ham, tannarx ham ochiq ketardi: dona narx
 * faqat ekranda hisoblanardi, ma'lumotning o'zi esa berilgan edi.
 * Kim istasa Firebase SDK bilan raqobatchining optom narxini ko'rib
 * olardi.
 *
 * Endi mahsulot HAR DOIM shu funksiyadan o'tadi:
 *   • `price` / `discountPrice` — mijoz KO'RISHI KERAK bo'lgan narx
 *     (optom mijozga optom, qolganlarga dona);
 *   • `costPrice`, `retailMarkupPercent`, `supplier` — mijozga
 *     UMUMAN ketmaydi (ustama foizi ketsa, dona narxdan optom narx
 *     teskari hisoblanib qolardi);
 *   • turlarning (`variants`) narxlari ham xuddi shunday.
 *
 * Xodim (owner/admin) uchun hujjat o'zgarmaydi — u optom narxni ham,
 * tannarxni ham ko'rishi kerak (admin panelda shu qiymatlar tahrirlanadi).
 *
 * MUHIM: mijozga mahsulot qaytaradigan HAR QANDAY yangi joy shu
 * funksiyadan o'tishi shart (`toViewerProduct` / `toViewerProducts`).
 */

/** Xodimmi (optom narx va tannarxni ko'rish huquqi bor). */
export function staffSeesInternal(role: UserRole | undefined): boolean {
  return role === "owner" || role === "admin";
}

/**
 * DO'KON VITRINASI UCHUN ROL.
 *
 * Sayt, ilova, bot va kanal — bularning hammasi MIJOZ oynasi.
 * Xodim ham o'sha yerda mijoz ko'rgan narxni ko'rishi kerak, aks
 * holda "saytda 70 000, botda 78 700" degan chalkashlik chiqadi
 * (aynan shunday bo'lgan: admin sifatida kirilganda vitrinada
 * optom narx turgan).
 *
 * Optom narx faqat IKKI joyda ko'rinadi:
 *   • optom mijozga (`role === "client"`) — u shunday narx bilan
 *     ishlaydi;
 *   • ADMIN PANELDA — u yerda so'rov `raw` bayrog'i bilan ketadi.
 */
export function storefrontRole(role: UserRole | undefined): UserRole {
  return isWholesaleRole(role) ? "client" : "user";
}

function viewerVariant(
  variant: ProductVariant,
  role: UserRole | undefined,
  markupPercent: number
): ProductVariant {
  const { costPrice: _costPrice, ...rest } = variant;
  return {
    ...rest,
    price: priceForRole(variant.price, role, markupPercent),
    discountPrice:
      variant.discountPrice && variant.discountPrice > 0
        ? priceForRole(variant.discountPrice, role, markupPercent)
        : null,
  };
}

/** Bitta mahsulotni ko'ruvchining roliga moslab tozalaydi. */
export function toViewerProduct(
  product: Product,
  role: UserRole | undefined,
  pricing: Pick<PricingSettings, "retailMarkupPercent">
): Product {
  if (staffSeesInternal(role)) return product;

  const markup = markupFor(product, pricing);
  const {
    costPrice: _costPrice,
    retailMarkupPercent: _markup,
    supplier: _supplier,
    ...rest
  } = product;

  // Chegirma muddati o'tgan bo'lsa chegirma narxi umuman berilmaydi -
  // aks holda mijoz eski chegirmani ko'rib qolardi.
  const discountLive = isDiscountActive(product);

  return {
    ...rest,
    price: priceForRole(product.price, role, markup),
    discountPrice:
      discountLive && product.discountPrice && product.discountPrice > 0
        ? priceForRole(product.discountPrice, role, markup)
        : null,
    variants: product.variants?.map((variant) => viewerVariant(variant, role, markup)),
  };
}

/** Ro'yxatni tozalaydi. */
export function toViewerProducts(
  products: Product[],
  role: UserRole | undefined,
  pricing: Pick<PricingSettings, "retailMarkupPercent">
): Product[] {
  if (staffSeesInternal(role)) return products;
  return products.map((product) => toViewerProduct(product, role, pricing));
}

/**
 * Mijoz kiritgan narx filtri (u KO'RSATILGAN narxda o'ylaydi) bazadagi
 * OPTOM narxga o'giriladi. Busiz "500 000 so'mgacha" deb filtrlagan
 * dona mijoz aslida optom narxi 500 000 gacha bo'lgan, ya'ni
 * ko'rinishda qimmatroq mahsulotlarni olardi.
 */
export function filterPriceToWholesale(
  value: number,
  role: UserRole | undefined,
  pricing: Pick<PricingSettings, "retailMarkupPercent">
): number {
  if (isWholesaleRole(role) || staffSeesInternal(role)) return value;
  const percent = pricing.retailMarkupPercent;
  if (!Number.isFinite(percent) || percent <= 0) return value;
  return Math.round(value / (1 + percent / 100));
}
