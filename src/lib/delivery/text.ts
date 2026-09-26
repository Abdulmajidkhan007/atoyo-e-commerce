import { DEFAULT_DELIVERY_SETTINGS, type DeliverySettings } from "@/types/promo";
import { formatSom } from "@/lib/format";

/**
 * YETKAZIB BERISH VA O'RNATISH VA'DASI — MATN.
 *
 * Bitta manba: sayt (bosh sahifa, mahsulot, savat, kontakt, "biz
 * haqimizda"), mobil ilova, bot va kanal posti shu funksiyalardan
 * o'qiydi. Ilgari bunday matn hech qayerda yo'q edi va mijoz
 * yetkazish bepulligini faqat qo'ng'iroq qilib bilardi.
 *
 * MUHIM: bu FAQAT matn. Yetkazish NARXI avvalgidek `fee`/`freeFrom`/
 * `zones` bo'yicha hisoblanadi (`lib/orders/promo.ts`) - bu yerda
 * hech qanday hisob yo'q, shuning uchun uni server ham, client ham,
 * ilova ham bemalol chaqiradi ("server-only" YO'Q).
 */

/** Sozlama qisman bo'lsa ham to'liq holatga keltiradi. */
export function withDeliveryDefaults(settings?: Partial<DeliverySettings> | null): DeliverySettings {
  return { ...DEFAULT_DELIVERY_SETTINGS, ...(settings ?? {}) };
}

/**
 * "Qo'qon ichida va atrofdagi 15 km gacha" — joy qismi (bo'lmasa "").
 */
function placePhrase(s: DeliverySettings): string {
  const city = (s.city ?? "").trim();
  const radius = Math.max(0, Math.round(s.freeRadiusKm ?? 0));
  if (city && radius > 0) return `${city} ichida va atrofdagi ${radius} km gacha`;
  if (city) return `${city} ichida`;
  if (radius > 0) return `${radius} km gacha`;
  return "";
}

/**
 * Yetkazish PULLIK bo'lsa (sozlamada yoqilgan va narxi bor) — uning
 * shartlari. Aks holda `null`: yetkazish shartsiz bepul.
 *
 * NEGA KERAK (haqiqiy savol): matn "15 km gacha yetkazib berish
 * bepul" deb turardi, lekin 4 000 so'mlik lipuchkani olib borish
 * uchun taksining o'ziga kamida 15 000 so'm ketadi. Hisob (`fee`,
 * `freeFrom`) allaqachon bor edi — faqat MATN uni aytmasdi va mijoz
 * savatda kutilmagan narxni ko'rardi.
 */
export function paidDeliveryTerms(
  settings?: Partial<DeliverySettings> | null
): { fee: number; freeFrom: number } | null {
  const s = withDeliveryDefaults(settings);
  if (!s.enabled || s.fee <= 0) return null;
  return { fee: s.fee, freeFrom: Math.max(0, s.freeFrom) };
}

/**
 * YETKAZISH matni. Uch holat:
 *   • shartsiz bepul: "Qo'qon ichida va atrofdagi 15 km gacha yetkazib berish bepul."
 *   • chegaradan bepul: "... 15 km gacha: 50 000 so'mdan boshlab yetkazib
 *     berish bepul, undan kam buyurtmaga — 15 000 so'm."
 *   • har doim pullik: "... 15 km gacha yetkazib berish — 15 000 so'm."
 * Admin o'z matnini yozgan bo'lsa — o'shanisi.
 */
export function freeDeliveryText(settings?: Partial<DeliverySettings> | null): string {
  const s = withDeliveryDefaults(settings);
  const custom = (s.note ?? "").trim();
  if (custom) return custom;

  const place = placePhrase(s);
  const terms = paidDeliveryTerms(s);
  if (terms && terms.freeFrom > 0) {
    const rule = `${formatSom(terms.freeFrom)}dan boshlab yetkazib berish bepul, undan kam buyurtmaga — ${formatSom(terms.fee)}.`;
    return place ? `${place}: ${rule}` : `${rule.charAt(0).toUpperCase()}${rule.slice(1)}`;
  }
  if (terms) {
    return place ? `${place} yetkazib berish — ${formatSom(terms.fee)}.` : `Yetkazib berish — ${formatSom(terms.fee)}.`;
  }
  if (place) return `${place} yetkazib berish bepul.`;
  return "Yetkazib berish xizmati mavjud.";
}

/** Qisqa variant (kartochka, footer, bot tugmasi ostida). */
export function freeDeliveryShort(settings?: Partial<DeliverySettings> | null): string {
  const s = withDeliveryDefaults(settings);
  const note = (s.note ?? "").trim();
  if (note) return note;
  const city = (s.city ?? "").trim();
  const radius = Math.max(0, Math.round(s.freeRadiusKm ?? 0));
  const place = city && radius > 0 ? `${city} + ${radius} km` : city;
  const terms = paidDeliveryTerms(s);

  if (terms && terms.freeFrom > 0) {
    const rule = `${formatSom(terms.freeFrom)}dan bepul yetkazish`;
    return place ? `${place} — ${rule}` : `${rule.charAt(0).toUpperCase()}${rule.slice(1)}`;
  }
  if (terms) return place ? `${place} — yetkazish ${formatSom(terms.fee)}` : `Yetkazish ${formatSom(terms.fee)}`;
  if (city && radius > 0) return `${city} + ${radius} km — bepul yetkazish`;
  if (city) return `${city} ichida bepul yetkazish`;
  return "Bepul yetkazish";
}

/**
 * "BEPUL YETKAZISHGA X SO'M QOLDI" — savat va 1-klik oynasi uchun.
 *
 * `null` — ko'rsatiladigan narsa yo'q (yetkazish bepul yoki chegara
 * yo'q). Aks holda: qancha qolgani va chiziq uchun foiz.
 */
export function freeDeliveryGap(
  settings: Partial<DeliverySettings> | null | undefined,
  payable: number
): { remaining: number; progress: number; freeFrom: number; fee: number } | null {
  const terms = paidDeliveryTerms(settings);
  if (!terms || terms.freeFrom <= 0) return null;
  const remaining = Math.max(0, Math.ceil(terms.freeFrom - Math.max(0, payable)));
  const progress = Math.min(100, Math.max(0, Math.round((payable / terms.freeFrom) * 100)));
  return { remaining, progress, freeFrom: terms.freeFrom, fee: terms.fee };
}

/**
 * O'RNATIB BERISH XIZMATI. Xizmat o'chirilgan bo'lsa `null` —
 * chaqiruvchi joy matnni umuman chizmaydi.
 */
export function installServiceText(settings?: Partial<DeliverySettings> | null): string | null {
  const s = withDeliveryDefaults(settings);
  if (s.installEnabled === false) return null;
  const custom = (s.installNote ?? "").trim();
  if (custom) return custom;

  const city = (s.city ?? "").trim();
  const near = city ? `${city} va atrofidagi mijozlarga` : "yaqin mijozlarga";
  return `Moyka, dush kabina va shunga o'xshash mahsulotlarni o'rnatib berish xizmati bor — ${near}. Buyurtma berayotganda ayting.`;
}
