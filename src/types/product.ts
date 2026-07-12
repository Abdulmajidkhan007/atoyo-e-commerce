export type ProductMaterial =
  | "polypropylene"
  | "metal-plastic"
  | "steel"
  | "copper"
  | "brass"
  | "cast-iron"
  | "pvc";

export type ProductCategory =
  | "pipes" // quvurlar
  | "fittings" // muftalar
  | "faucets" // kranlar
  | "shower-systems" // dush tizimlari
  | "boilers" // isitish qozonlari
  | "radiators"
  | "pumps"
  | "sanitary-ware";

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
  category: ProductCategory;
  brand: string;
  manufacturerCountry: string;
  /** Mahsulot kimdan kelgan (yetkazib beruvchi) - kirim hujjati uchun. */
  supplier?: string;
  material: ProductMaterial;
  dimensions: ProductDimensions;
  price: number;
  discountPrice?: number | null;
  currency: "UZS";
  stock: number;
  images: string[];
  thumbnailUrl: string;
  isActive: boolean;
  /** Necha marta buyurtma qilingani - admin tahlillarida "eng ko'p sotilgan" saralash uchun. */
  salesCount: number;
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
