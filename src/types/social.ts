/**
 * IJTIMOIY TARMOQLAR (Instagram, Facebook, YouTube).
 *
 * Telegram kanalidagi kabi: mahsulot yaratilganda yoki kirim
 * qilinganda post ketadi. Farqi - bu tarmoqlarda kunlik chegara bor
 * (masalan Instagram: 24 soatda 50 ta post), shuning uchun postlar
 * NAVBATGA qo'yiladi va navbat sekin-asta bo'shatiladi.
 */

export type SocialNetwork = "instagram" | "facebook" | "youtube";

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
};

export interface SocialSettings {
  /** Qaysi tarmoqqa avtomatik post ketadi. */
  instagram: boolean;
  facebook: boolean;
  /** YouTube faqat VIDEOSI bor mahsulot uchun (Shorts). */
  youtube: boolean;
  /**
   * Post matni shabloni. O'rniga qo'yiladigan belgilar:
   * {nomi} {kodi} {narx} {kategoriya} {brend} {tavsif} {havola}
   */
  template: string;
  /** Bir tarmoqqa kuniga ko'pi bilan shuncha post (Instagram chegarasi 50). */
  dailyLimit: number;
  /** Post oxiriga qo'shiladigan heshteglar. */
  hashtags: string;
}

export const DEFAULT_SOCIAL_SETTINGS: SocialSettings = {
  instagram: false,
  facebook: false,
  youtube: false,
  template: "{nomi}\n\nKodi: {kodi}\nNarxi: {narx}\n\n{havola}",
  dailyLimit: 20,
  hashtags: "#atoyo #santexnika #otopleniye #toshkent",
};

export type SocialJobStatus = "pending" | "done" | "failed";

/** Navbatdagi bitta post. */
export interface SocialJob {
  id: string;
  /**
   * NIMA post qilinadi: mahsulot (standart) yoki BLOG maqolasidagi
   * kontent videosi. Eski hujjatlarda bu maydon yo'q — o'shalar
   * mahsulot deb qabul qilinadi.
   */
  kind?: "product" | "blog";
  /** Mahsulot ID si (blog ishida bo'sh). */
  productId: string;
  /** Blog maqolasi ID si (`kind === "blog"`). */
  blogId?: string;
  /** Ro'yxatda ko'rinadigan nom (mahsulot nomi yoki maqola sarlavhasi). */
  productName: string;
  network: SocialNetwork;
  status: SocialJobStatus;
  /** Nechta marta urinilgani (3 tadan keyin to'xtaydi). */
  attempts: number;
  error?: string | null;
  /** Tarmoqdagi post ID si (muvaffaqiyatli bo'lsa). */
  postId?: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Kalitlar to'liq sozlanganini tekshirish uchun niqoblangan ko'rinish. */
export interface SocialSecretsStatus {
  /** Meta dasturi (App ID + Secret) kiritilganmi. */
  metaApp: boolean;
  facebookPage: boolean;
  instagram: boolean;
  youtube: boolean;
}
