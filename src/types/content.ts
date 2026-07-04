export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  /** Qisqa tavsif (ro'yxatda ko'rsatiladi) */
  excerpt: string;
  /** To'liq matn (oddiy matn / paragraflar) */
  content: string;
  coverImageUrl: string;
  isPublished: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Admin tahrirlaydigan "Biz haqimizda" sahifasi mazmuni. */
export interface AboutContent {
  title: string;
  body: string;
}

export interface SocialLink {
  platform: "instagram" | "telegram" | "youtube" | "facebook";
  url: string;
}

/** Saytning umumiy sozlamalari (footer/about uchun) - admin boshqaradi. */
export interface SiteSettings {
  phone: string;
  email: string;
  address: string;
  socials: SocialLink[];
  about: AboutContent;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  phone: "+998 90 123 45 67",
  email: "info@atoyo-santexnika.uz",
  address: "Toshkent shahri",
  socials: [
    { platform: "instagram", url: "" },
    { platform: "telegram", url: "" },
    { platform: "youtube", url: "" },
  ],
  about: {
    title: "Biz haqimizda",
    body: "Atoyo Santexnika — quvurlar, muftalar, kranlar, dush tizimlari va isitish qozonlari bo'yicha ishonchli yetkazib beruvchi. Bizning maqsadimiz — sifatli mahsulotni qulay narxda yetkazib berish.",
  },
};
