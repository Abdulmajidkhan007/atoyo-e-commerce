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

/**
 * TURLAR (variantlar) — bitta mahsulotning o'lchami/rangi/qalinligi
 * bo'yicha farq qiladigan ko'rinishlari.
 *
 * Misol: "Basu moyka" — o'lchami 50x60 / 60x80, qalinligi 0.2mm / 0.3mm.
 * Bularning har biri uchun alohida mahsulot ochish o'rniga BITTA
 * mahsulot ochiladi, rasm ham bitta bo'ladi, mijoz esa sahifada turini
 * tanlaydi va narx o'shanga qarab o'zgaradi.
 *
 *   variantAxes - tanlov qatorlari: [{ key:"olcham", label:"O'lcham",
 *                 values:["50x60","60x80"] }, { key:"qalinlik", ... }]
 *   variants    - qatorlarning har bir kombinatsiyasi: o'z narxi va
 *                 zaxirasi bilan.
 */
export interface VariantAxis {
  /** Ichki kalit (masalan "olcham") - o'zgarmaydi. */
  key: string;
  /** Ko'rinadigan nom (masalan "O'lcham"). */
  label: string;
  values: string[];
}

export interface ProductVariant {
  /** Qiymatlardan yasalgan barqaror kalit: "50x60|0.3mm". */
  id: string;
  /** { olcham: "50x60", qalinlik: "0.3mm" } */
  options: Record<string, string>;
  price: number;
  /**
   * TANNARX - mahsulot bizga qancha tushgan (so'm, bir birlik uchun).
   * Faqat xodimlarga ko'rinadi; foyda shu asosda hisoblanadi. Kirim
   * qilinganda avtomatik yangilanadi (oxirgi kelgan narx).
   */
  costPrice?: number | null;
  discountPrice?: number | null;
  stock: number;
  /** Shu turning o'z artikuli (ixtiyoriy). */
  sku?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Kichik harflarga o'girilgan, diakritiksiz qidiruv indeksi (fuzzy search uchun) */
  nameSearchIndex: string;
  /** Nom/brend so'zlari (array-contains qidiruvi - so'z nomning istalgan joyida bo'lsa topadi) */
  nameTokens?: string[];
  /**
   * MAXSUS KALIT SO'ZLAR - o'zaro ALMASHTIRILADIGAN mahsulotlarni
   * bog'lab turadi. Masalan "rakovina-kalta-smesitel" kaliti bir necha
   * brendning bir xil vazifadagi mahsulotlarida bo'lsa, mijoz bittasini
   * qidirganda (yoki u tugab qolganda) qolganlari ham ko'rsatiladi.
   * Ixtiyoriy, lekin kirim formasida ko'zga tashlanadigan joyda turadi.
   */
  keywords?: string[];
  description: string;
  /**
   * TARJIMALAR (ixtiyoriy). Do'kon asosan o'zbekcha ishlaydi, lekin
   * mijozning katta qismi ruschada qidiradi - shuning uchun nom va
   * tavsifning ruscha/inglizcha varianti alohida saqlanadi. Bo'sh
   * bo'lsa o'zbekchasi ko'rsatiladi (fallback), ya'ni eski mahsulotlar
   * hech qanday o'zgarishsiz ishlayveradi. Qidiruv tokenlariga
   * tarjimalar ham qo'shiladi - "смеситель" deb qidirilsa topiladi.
   */
  nameRu?: string;
  nameEn?: string;
  descriptionRu?: string;
  descriptionEn?: string;
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
  /**
   * Turlar (o'lcham/rang/qalinlik...). Bo'sh bo'lsa - oddiy mahsulot:
   * narx va zaxira `price`/`stock` da. Turlari bo'lsa `price` eng arzon
   * turning narxi bo'ladi (katalogdagi saralash va filtrlar shu bo'yicha
   * ishlashi uchun), `stock` esa hamma turlarning yig'indisi.
   */
  variantAxes?: VariantAxis[];
  variants?: ProductVariant[];
  /**
   * OPTOM narx (so'm). Admin faqat shuni kiritadi; dona (chakana) narx
   * bundan ustama foizi bilan hisoblanadi - `lib/products/wholesale.ts`.
   */
  price: number;
  /** Shu mahsulotga alohida ustama foizi (bo'lmasa - umumiy sozlama). */
  retailMarkupPercent?: number | null;
  /**
   * TANNARX - mahsulot bizga qancha tushgan (so'm, bir birlik uchun).
   * Faqat xodimlarga ko'rinadi; foyda shu asosda hisoblanadi. Kirim
   * qilinganda avtomatik yangilanadi (oxirgi kelgan narx).
   */
  costPrice?: number | null;
  discountPrice?: number | null;
  /** Chegirma amal qilish muddati (epoch millis). Bo'sh - muddatsiz. */
  discountUntil?: number | null;
  currency: "UZS";
  stock: number;
  images: string[];
  /** Mahsulot videolari (Telegram kirimida yuborilgan qisqa videolar). */
  videos?: string[];
  thumbnailUrl: string;
  /**
   * Mahsulot tartib raqami (1, 2, 3...). Hujjat ID si tasodifiy
   * harflardan iborat bo'lgani uchun odamlar uchun mo'ljallangan qisqa
   * raqam: guruh xabarlarida, kanal postida va bot buyruqlarida shu
   * ko'rsatiladi (`lib/products/product-code.ts`).
   */
  code?: number;
  isActive: boolean;
  /**
   * CHERNOVIK: mahsulot ochilgan, lekin hali katalogga chiqmagan va
   * kanalga e'lon qilinmagan. Telegram kirimida "✅ Yetarli, tayyor"
   * bosilganda yoki saytdagi kirim orqali zaxira kelganda nashr bo'ladi.
   */
  isDraft?: boolean;
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
  /**
   * Kanaldagi postning sarlavhasi: "Yangi mahsulot!" yoki "Mahsulot
   * yangilandi". Post jimgina yangilanganda (masalan ixtiyoriy maydon
   * to'ldirilganda) sarlavha o'zgarmasligi uchun saqlanadi.
   */
  channelMode?: "new" | "updated";
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
