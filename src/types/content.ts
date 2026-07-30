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
  /** Do'kon/jamoa rasmi (About sahifasida ko'rsatiladi). */
  imageUrl: string;
}

export interface SocialLink {
  platform: "instagram" | "telegram" | "youtube" | "facebook";
  url: string;
}

/** Saytning umumiy sozlamalari (footer/about uchun) - admin boshqaradi. */
/** Kanal postining oxiridagi havola (nomi + manzili). */
export interface PostLink {
  title: string;
  url: string;
}

/**
 * Telegram kanaliga chiqadigan postning "footeri": mahsulot
 * ma'lumotidan keyin telefon(lar), shior va havolalar.
 */
export interface ChannelPostFooter {
  /** Har biri alohida qatorda chiqadi. */
  phones: string[];
  /** Do'kon shiori ("Sifat narxdan ustun" kabi). */
  slogan: string;
  /** Manzil (ixtiyoriy) - shiordan keyin. */
  address: string;
  /** Telegram / Instagram / YouTube / Operator / Sayt ... */
  links: PostLink[];
}

export interface SiteSettings {
  phone: string;
  email: string;
  address: string;
  socials: SocialLink[];
  about: AboutContent;
  /** Kanal posti footeri (admin sozlamalaridan tahrirlanadi). */
  channelFooter?: ChannelPostFooter;
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
    body:
      "Atoyo Santexnika & Otopleniye — santexnika va isitish tizimlari bo'yicha ishonchli yetkazib beruvchi hamkoringiz. Biz quvurlar, muftalar, kranlar, dush tizimlari, radiatorlar va isitish qozonlarini keng assortimentda taklif etamiz.\n\n" +
      "Bizning maqsadimiz — sifatli mahsulotni qulay narxda, tez va ishonchli yetkazib berish. Har bir mijozimizga individual yondashamiz va professional maslahat beramiz.\n\n" +
      "Yillar davomida to'plangan tajribamiz va ishonchli hamkorlarimiz tufayli mahsulotlarimiz sifatiga kafolat beramiz. Bizni tanlaganingiz uchun rahmat!",
    imageUrl: "",
  },
  channelFooter: {
    phones: [],
    slogan: "",
    address: "",
    links: [],
  },
};
