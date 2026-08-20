/**
 * Ma'lumot turlari - saytdagi `src/types/*` bilan bir xil shakl.
 * Ikkalasi bitta Firestore bazasidan o'qigani uchun nomlar mos kelishi
 * shart; bu yerda ilovaga kerak bo'lgan maydonlar saqlangan.
 */
/**
 * Kategoriya slug'i. Saytdagi kabi ODDIY MATN: admin panelda yangi
 * kategoriya ochilsa (metadata/taxonomy) ilova uni ham ko'rsatishi
 * kerak - shuning uchun qat'iy ro'yxat emas.
 */
export type ProductCategory = string;

/**
 * TURLAR (variantlar) - saytdagi `src/types/product.ts` bilan bir xil.
 * Bitta mahsulotning o'lchami/rangi/qalinligi bo'yicha farq qiladigan
 * ko'rinishlari; har birining o'z narxi va zaxirasi bor.
 */
export interface VariantAxis {
  key: string;
  label: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  options: Record<string, string>;
  price: number;
  discountPrice?: number | null;
  stock: number;
  sku?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  /** Tarjimalar - bo'sh bo'lsa o'zbekchasi ko'rsatiladi (sayt bilan bir xil). */
  nameRu?: string;
  nameEn?: string;
  descriptionRu?: string;
  descriptionEn?: string;
  category: ProductCategory;
  /** Maxsus kalit so'zlar - o'zaro almashtiriladigan mahsulotlar. */
  keywords?: string[];
  brand: string;
  manufacturerCountry: string;
  material: string;
  /** Do'kon kodi / artikul (turlari bo'lsa har turning o'z kodi bor). */
  sku?: string;
  /** OPTOM narx - dona narx ustama bilan hisoblanadi (`pricing.ts`). */
  price: number;
  /** Shu mahsulotga alohida ustama foizi (bo'lmasa - umumiy sozlama). */
  retailMarkupPercent?: number | null;
  discountPrice: number | null;
  discountUntil?: number | null;
  stock: number;
  images: string[];
  /**
   * Mahsulot videolari (Telegram kirimida yoki admin panelda
   * yuklangan). Galereyada rasmlardan keyin ko'rinadi.
   */
  videos?: string[];
  thumbnailUrl: string;
  isActive: boolean;
  isDraft?: boolean;
  /** O'rnatib berish xizmati bor mahsulot (moyka, dush kabina...). */
  installService?: boolean;
  /** Mahsulot tartib raqami (saytdagi "№" ustuni). */
  code?: number;
  /** Kimdan kelgan (kirim uchun). */
  supplier?: string;
  variantAxes?: VariantAxis[];
  variants?: ProductVariant[];
  ratingAvg?: number;
  ratingCount?: number;
  createdAt: number;
}

export interface CartItem {
  productId: string;
  /** Tanlangan tur kaliti (turlari bo'lgan mahsulotda). */
  variantId?: string;
  /** "50x60 • 0.3mm" - savatda va buyurtmada ko'rinadi. */
  variantLabel?: string;
  name: string;
  price: number;
  quantity: number;
  thumbnailUrl: string;
}

export type OrderStatus = 'pending' | 'approved' | 'delivering' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  userId: string | null;
  customerName: string;
  phoneNumber: string;
  items: CartItem[];
  subtotal?: number;
  promoCode?: string | null;
  discountAmount?: number;
  deliveryFee?: number;
  totalAmount: number;
  deliveryAddress: string | null;
  paymentMethod: 'cash' | 'online';
  status: OrderStatus;
  createdAt: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: number;
}

/** Blog maqolasi - saytdagi `BlogPost` bilan bir xil shakl. */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  /**
   * Kontent videosi (mahsulot videosi emas). Ilovada video pleyer
   * yo'q - tugma bosilsa video brauzerda ochiladi.
   */
  videoUrl?: string;
  isPublished: boolean;
  createdAt: number;
}

/**
 * Kategoriyalar tartibi (nomlari tarjimada - `src/i18n.tsx`).
 * Sayt bilan bir xil ketma-ketlik.
 */
export const CATEGORY_KEYS: ProductCategory[] = [
  'pipes',
  'fittings',
  'faucets',
  'shower-systems',
  'boilers',
  'radiators',
  'pumps',
  'sanitary-ware',
];

/**
 * Mahsulot nomi/tavsifi tanlangan tilda. Tarjima kiritilmagan bo'lsa
 * o'zbekchasi qaytadi - saytdagi `lib/products/i18n.ts` bilan bir xil.
 */
export function localizedName(product: Pick<Product, 'name' | 'nameRu' | 'nameEn'>, locale: string): string {
  if (locale === 'ru') return product.nameRu?.trim() || product.name;
  if (locale === 'en') return product.nameEn?.trim() || product.name;
  return product.name;
}

/**
 * 1C narxnomasidan kelgan tavsifda xizmat ma'lumoti bo'ladi
 * ("1C kodi: 5967. Qadoqda: 6 dona"). Ichki kod mijozga kerak emas -
 * saytdagi `lib/products/description.ts` bilan bir xil qoida.
 */
const INTERNAL_CODE =
  /(^|[.;\n])[^\S\n]*1\s*[cC\u0441\u0421]\s*[k\u043a][o\u043e][d\u0434][a-zA-Z\u0430-\u044f\u0410-\u042f]{0,2}\s*[:\-\u2013]\s*[^.\n;]*/gi;

export function publicDescription(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(INTERNAL_CODE, (_match, before?: string) => before ?? '')
    .replace(/\.\s*\./g, '.')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[\s.;,\u2013-]+/, '')
    .replace(/[\s;,]+$/, '')
    .trim();
}

export function localizedDescription(
  product: Pick<Product, 'description' | 'descriptionRu' | 'descriptionEn'>,
  locale: string,
): string {
  if (locale === 'ru')
    return publicDescription(product.descriptionRu?.trim() || product.description);
  if (locale === 'en')
    return publicDescription(product.descriptionEn?.trim() || product.description);
  return publicDescription(product.description);
}

/** Chegirma muddati o'tgan bo'lsa - to'liq narx (sayt bilan bir xil qoida). */
export function effectivePrice(product: Product): number {
  const active =
    !!product.discountPrice &&
    product.discountPrice < product.price &&
    (!product.discountUntil || product.discountUntil > Date.now());
  return active ? product.discountPrice! : product.price;
}
