/**
 * Material va kategoriya endi qat'iy ro'yxat emas: standart qiymatlar
 * `lib/products/taxonomy.ts` da, admin panel esa yangilarini qo'sha
 * oladi (Firestore `metadata/taxonomy`). Shuning uchun bu yerda oddiy
 * slug (matn) turadi - eski qiymatlar ham shundayligicha ishlaydi.
 */
export type ProductMaterial = string;

export type ProductCategory = string;

/** Sotish turi: dona, metr, kg, litr... (`taxonomy.ts` dagi `units`). */
export type ProductUnit = string;

export interface ProductDimensions {
  diameterMm?: number;
  lengthMm?: number;
  weightKg?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Kichik harflarga o'girilgan, diakritiksiz qidiruv indeksi (fuzzy search uchun) */
  nameSearchIndex: string;
  /** Nom/brend so'zlari (array-contains qidiruvi - so'z nomning istalgan joyida bo'lsa topadi) */
  nameTokens?: string[];
  description: string;
  /** Do'kon kodi / artikul (masalan "HS897") - qidiruvda ham ishlaydi. */
  sku?: string;
  category: ProductCategory;
  brand: string;
  manufacturerCountry: string;
  /** Mahsulot kimdan kelgan (yetkazib beruvchi) - kirim hujjati uchun. */
  supplier?: string;
  material: ProductMaterial;
  /** Mahsulot nima bilan sotiladi: dona / metr / kg ... (standart "dona"). */
  unit: ProductUnit;
  dimensions: ProductDimensions;
  price: number;
  discountPrice?: number | null;
  /** Chegirma amal qilish muddati (epoch millis). Bo'sh - muddatsiz. */
  discountUntil?: number | null;
  currency: "UZS";
  stock: number;
  images: string[];
  /** Mahsulot videolari (Telegram kirimida yuborilgan qisqa videolar). */
  videos?: string[];
  thumbnailUrl: string;
  isActive: boolean;
  /** Necha marta buyurtma qilingani - admin tahlillarida "eng ko'p sotilgan" saralash uchun. */
  salesCount: number;
  /**
   * E'lon kanalidagi post - mahsulot yangilanganda yangi post tashlamay,
   * o'shanisi tahrirlanadi (`lib/telegram/channel.ts`).
   */
  channelChatId?: string;
  channelMessageId?: number;
  /** E'lon paytidagi rasm soni - o'zgargan bo'lsa post qaytadan tashlanadi. */
  channelPhotoCount?: number;
  /** Sharhlar reytingi (POST /api/products/[id]/reviews avtomatik yangilaydi). */
  ratingSum?: number;
  ratingCount?: number;
  ratingAvg?: number;
  createdAt: number; // epoch millis
  updatedAt: number;
}

/** Firestore composite-index filtrlari uchun so'rov parametrlari */
export interface ProductFilterParams {
  category?: ProductCategory;
  brand?: string;
  material?: ProductMaterial;
  manufacturerCountry?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sortBy?: "price-asc" | "price-desc" | "newest" | "popular";
}
