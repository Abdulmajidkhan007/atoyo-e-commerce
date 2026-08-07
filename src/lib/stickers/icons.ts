/**
 * IKONKA RO'YXATI - CLIENT uchun.
 *
 * `art.ts` server tomonda SVG yasaydi (Buffer ishlatadi), shuning
 * uchun admin panel faqat NOMLARNI shu yerdan oladi.
 */
export const STICKER_ICONS = [
  "star",
  "gift",
  "question",
  "check",
  "box",
  "phone",
  "truck",
  "car",
  "mosque",
  "heart",
  "clock",
  "wrench",
  "droplet",
  "tag",
  "megaphone",
] as const;

export const STICKER_ICON_LABELS: Record<string, string> = {
  none: "Ikonkasiz",
  star: "Yulduz",
  gift: "Sovg'a",
  question: "Savol",
  check: "Tasdiq",
  box: "Quti",
  phone: "Telefon",
  truck: "Yetkazish",
  car: "Mashina",
  mosque: "Masjid",
  heart: "Yurak",
  clock: "Soat",
  wrench: "Kalit",
  droplet: "Tomchi",
  tag: "Chegirma",
  megaphone: "E'lon",
};
