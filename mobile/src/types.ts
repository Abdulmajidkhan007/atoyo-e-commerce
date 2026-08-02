/**
 * Ma'lumot turlari - saytdagi `src/types/*` bilan bir xil shakl.
 * Ikkalasi bitta Firestore bazasidan o'qigani uchun nomlar mos kelishi
 * shart; bu yerda ilovaga kerak bo'lgan maydonlar saqlangan.
 */
export type ProductCategory =
  | 'pipes'
  | 'fittings'
  | 'faucets'
  | 'shower-systems'
  | 'boilers'
  | 'radiators'
  | 'pumps'
  | 'sanitary-ware';

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
  category: ProductCategory;
  brand: string;
  manufacturerCountry: string;
  material: string;
  price: number;
  discountPrice: number | null;
  discountUntil?: number | null;
  stock: number;
  images: string[];
  thumbnailUrl: string;
  isActive: boolean;
  isDraft?: boolean;
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

/** Chegirma muddati o'tgan bo'lsa - to'liq narx (sayt bilan bir xil qoida). */
export function effectivePrice(product: Product): number {
  const active =
    !!product.discountPrice &&
    product.discountPrice < product.price &&
    (!product.discountUntil || product.discountUntil > Date.now());
  return active ? product.discountPrice! : product.price;
}
