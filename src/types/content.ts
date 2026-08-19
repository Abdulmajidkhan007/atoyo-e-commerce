/** Maqola qaysi kanallarga yuborilishi (admin formadagi belgilar). */
export interface BlogDestinations {
  /** Telegram kanali (rasm yoki video posti). */
  telegram: boolean;
  /** YouTube - faqat maqolada VIDEO bo'lsa. */
  youtube: boolean;
  instagram: boolean;
  facebook: boolean;
}

/**
 * Standart yo'nalishlar = loyihaning ilgarigi xatti-harakati:
 * Telegram + (video bo'lsa) YouTube. Instagram/Facebook ataylab
 * o'chiq - ular blogda yangi imkoniyat, admin o'zi belgilaydi.
 */
export const DEFAULT_BLOG_DESTINATIONS: BlogDestinations = {
  telegram: true,
  youtube: true,
  instagram: false,
  facebook: false,
};

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  /** Qisqa tavsif (ro'yxatda ko'rsatiladi) */
  excerpt: string;
  /** To'liq matn (oddiy matn / paragraflar) */
  content: string;
  coverImageUrl: string;
  /**
   * KONTENT VIDEOSI (mahsulot videosi EMAS) — maslahat, ko'rsatma,
   * do'kon hayotidan lavha. Bo'lsa maqola chop etilganda:
   *   • Telegram kanaliga video sifatida chiqadi;
   *   • YouTube'ga (Shorts) navbat orqali yuklanadi.
   * Storage papkasi: `blog`.
   */
  videoUrl?: string;
  /** YouTube'ga yuklangan bo'lsa - video ID (takror yuklanmasin). */
  youtubeVideoId?: string;
  /**
   * MAQOLA QAYERGA YUBORILADI (admin formada belgilanadi).
   *
   * Ilgari yo'nalish qat'iy edi: har maqola Telegram kanaliga ketardi
   * va videosi bo'lsa YouTube'ga tushardi - Instagram/Facebook esa
   * umuman yo'q edi. Endi har maqolada alohida tanlanadi.
   *
   * Eski hujjatlarda bu maydon yo'q - o'shalar avvalgidek
   * (`DEFAULT_BLOG_DESTINATIONS`) qabul qilinadi.
   */
  destinations?: BlogDestinations;
  /** Kanaldagi post - yangilanganda yangi post tashlanmaydi. */
  channelChatId?: string;
  channelMessageId?: number;
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
  /**
   * 3D REJIM TUGMASI SAYTDA KO'RINSINMI.
   *
   * Standart holat — **o'chiq**: 3D ko'rinish hali sinovda va u
   * xarid oqimiga aloqador emas. Admin buni yoqsa header'da
   * "✨ 3D / 📄 Klassik" tugmasi paydo bo'ladi va mijozlar ham
   * tanlay oladi; o'chiq bo'lsa hamma klassik ko'rinishda ishlaydi
   * (og'ir kutubxonalar umuman yuklanmaydi).
   */
  show3dMode?: boolean;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  phone: "+998 90 123 45 67",
  email: "info@atoyo-santexnika.uz",
  // Haqiqiy do'kon manzili (admin sozlamasi bo'sh bo'lsa shu ishlatiladi).
  address: "Qo'qon, Navbahor ko'chasi 45p",
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
  show3dMode: false,
  channelFooter: {
    phones: [],
    slogan: "",
    address: "",
    links: [],
  },
};
