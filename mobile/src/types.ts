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
  ratingAvg?: number;
  ratingCount?: number;
  createdAt: number;
}

export interface CartItem {
  productId: string;
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

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  pipes: 'Quvurlar',
  fittings: 'Muftalar',
  faucets: 'Kranlar',
  'shower-systems': 'Dush tizimlari',
  boilers: 'Isitish qozonlari',
  radiators: 'Radiatorlar',
  pumps: 'Nasoslar',
  'sanitary-ware': 'Santexnika buyumlari',
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Kutilmoqda',
  approved: 'Qabul qilindi',
  delivering: 'Yetkazilmoqda',
  completed: 'Yakunlandi',
  cancelled: 'Bekor qilindi',
};

/** Chegirma muddati o'tgan bo'lsa - to'liq narx (sayt bilan bir xil qoida). */
export function effectivePrice(product: Product): number {
  const active =
    !!product.discountPrice &&
    product.discountPrice < product.price &&
    (!product.discountUntil || product.discountUntil > Date.now());
  return active ? product.discountPrice! : product.price;
}
