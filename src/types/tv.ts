/**
 * DO'KONDAGI TELEVIZOR (reklama ekrani).
 *
 * `/tv` sahifasi - do'konga osilgan televizor uchun: katta rasm, katta
 * narx, avtomatik aylanuvchi slayder va QR kod ("telefonda ochish").
 * Televizorga alohida ILOVA kerak emas - Android TV box yoki Smart TV
 * brauzeri kiosk rejimida shu manzilni ochadi.
 *
 * Nima ko'rsatilishi va har slayd qancha turishi admin panelda
 * (`/admin/tv`, Firestore `settings/tv`) boshqariladi.
 */

/** Slaydlar qayerdan olinadi. */
export type TvSource = "new" | "top" | "discount" | "category" | "manual";

export const TV_SOURCE_LABELS: Record<TvSource, string> = {
  new: "Yangi kelganlar",
  top: "Eng ko'p sotilganlar",
  discount: "Chegirmadagilar",
  category: "Tanlangan kategoriyalar",
  manual: "Qo'lda tanlangan mahsulotlar",
};

export interface TvSettings {
  /** O'chirilgan bo'lsa ekranda faqat do'kon nomi va logotip turadi. */
  enabled: boolean;
  source: TvSource;
  /** `source: "category"` uchun kategoriya slug'lari. */
  categories: string[];
  /** `source: "manual"` uchun mahsulot ID lari (tartibi saqlanadi). */
  productIds: string[];
  /** Nechta mahsulot aylanadi (5-40). */
  count: number;
  /** Bitta slayd necha soniya turadi (4-60). */
  slideSeconds: number;
  /** Zaxirasi tugaganlarni ko'rsatmaslik. */
  onlyInStock: boolean;
  /** Narx ko'rsatilsinmi (har doim DONA narx). */
  showPrice: boolean;
  /** QR kod - mijoz telefonida shu mahsulot sahifasi ochiladi. */
  showQr: boolean;
  /** Ekranning yuqorisidagi sarlavha. */
  headline: string;
  /** Pastdagi yuguruvchi qator (aksiya, ish vaqti, manzil). */
  ticker: string;
  /** Pastda ko'rsatiladigan telefon raqami (bo'sh bo'lsa chiqmaydi). */
  phone: string;
}

export const DEFAULT_TV_SETTINGS: TvSettings = {
  enabled: true,
  source: "new",
  categories: [],
  productIds: [],
  count: 20,
  slideSeconds: 10,
  onlyInStock: true,
  showPrice: true,
  showQr: true,
  headline: "Atoyo Santexnika & Otopleniye",
  ticker: "Optom va dona savdo · Yetkazib berish · atoyo-uz.web.app",
  phone: "",
};

/** Ekranga chiqadigan bitta slayd (mijozga ko'rinadigan ma'lumot). */
export interface TvSlide {
  id: string;
  name: string;
  image: string | null;
  /** DONA (chakana) narx - televizor ommaviy ekran. */
  price: number;
  /** Chegirma bo'lsa - eski narx (ustidan chizilgan holda ko'rsatiladi). */
  oldPrice: number | null;
  categoryLabel: string;
  brand: string;
  unitLabel: string;
  inStock: boolean;
  /** To'liq havola - QR kod shuni ochadi. */
  url: string;
}
