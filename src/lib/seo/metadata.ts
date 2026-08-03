import { siteUrl, SITE_NAME } from "./json-ld";

/**
 * SAYT META MA'LUMOTLARI (SEO).
 *
 * Uch narsa uchun kerak:
 *  1) Google/Yandex qidiruvida topilish — sarlavha, tavsif, kalit so'zlar
 *     uch alifboda (lotin, kirill, ruscha) — odam "santexnika",
 *     "сантехника" yoki "santexnika do'koni Toshkent" deb qidirsa ham
 *     bir xil sahifa chiqadi;
 *  2) Telegram/WhatsApp/Facebook'ga havola tashlanganda chiroyli
 *     kartochka (rasm + sarlavha + tavsif) ko'rinishi — Open Graph;
 *  3) brauzer yorlig'ida (tab) va xatcho'pda to'g'ri nom turishi.
 */

export const SITE_TITLE = `${SITE_NAME} & Otopleniye — santexnika va isitish tizimlari do'koni`;

export const SITE_DESCRIPTION =
  "Quvurlar, muftalar, kranlar, dush tizimlari, radiatorlar, isitish qozonlari va nasoslar — " +
  "10 000+ mahsulot bir joyda. Toshkent bo'ylab yetkazib berish, kafolat va professional maslahat. " +
  "Сантехника и отопление: трубы, фитинги, смесители, радиаторы, котлы — доставка по Ташкенту.";

/**
 * KALIT SO'ZLAR. Uzbek (lotin + kirill), rus va ingliz variantlari —
 * O'zbekistonda odamlar uch xil yozadi va qidiruv tizimi har birini
 * alohida tushunadi.
 */
export const SITE_KEYWORDS = [
  // Brend
  "Atoyo", "Atoyo Santexnika", "Atoyo Otopleniye", "atoyo.uz", "Atoyo santexnika do'koni",
  "Атойо", "Атойо сантехника",
  // Umumiy (uz lotin)
  "santexnika", "santexnika do'koni", "santexnika mahsulotlari", "otopleniye",
  "isitish tizimlari", "isitish qozoni", "issiq suv tizimi", "santexnika Toshkent",
  "santexnika narxlari", "santexnika onlayn do'kon", "santexnika yetkazib berish",
  // Umumiy (uz kirill)
  "сантехника дукони", "сантехника Тошкент", "иситиш тизимлари", "иситиш козони",
  // Mahsulot turlari (uz)
  "quvurlar", "plastik quvur", "polipropilen quvur", "metalloplastik quvur",
  "muftalar", "fitinglar", "kranlar", "sharli kran", "smesitel", "dush tizimlari",
  "dush kabinasi", "radiator", "alyuminiy radiator", "bimetall radiator",
  "isitish qozonlari", "gaz qozoni", "nasos", "sirkulyatsion nasos",
  "rakovina", "moyka", "unitaz", "vanna", "santexnika armaturasi", "xostovar",
  // Mahsulot turlari (ru)
  "сантехника", "отопление", "трубы", "полипропиленовые трубы", "фитинги",
  "смесители", "краны", "шаровой кран", "душевые системы", "душевая кабина",
  "радиаторы отопления", "алюминиевый радиатор", "биметаллический радиатор",
  "газовый котел", "котлы отопления", "насосы", "циркуляционный насос",
  "раковина", "мойка", "унитаз", "ванна", "сантехника Ташкент",
  "сантехника Узбекистан", "купить сантехнику", "сантехника цены", "доставка сантехники",
  // Ingliz
  "plumbing", "heating", "plumbing store Uzbekistan", "pipes", "fittings",
  "faucets", "shower systems", "radiators", "boilers", "pumps", "sanitary ware",
  // Xizmat / geo
  "Toshkent", "Ташкент", "Tashkent", "O'zbekiston", "Узбекистан", "Uzbekistan",
  "yetkazib berish", "доставка", "kafolat", "гарантия", "ulgurji narx", "оптом",
];

/** Ijtimoiy tarmoq kartochkasidagi rasm (Telegram, Facebook, WhatsApp). */
export function ogImage(): { url: string; width: number; height: number; alt: string } {
  return {
    // Bosh sahifa uchun tayyor banner (bot salomlashuvida ham shu ishlatiladi).
    url: `${siteUrl()}/api/og/welcome`,
    width: 1200,
    height: 630,
    alt: SITE_TITLE,
  };
}
