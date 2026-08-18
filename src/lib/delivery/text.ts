import { DEFAULT_DELIVERY_SETTINGS, type DeliverySettings } from "@/types/promo";

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
 * BEPUL YETKAZISH matni:
 * "Qo'qon ichida va 15 km atrofga yetkazib berish bepul".
 * Admin o'z matnini yozgan bo'lsa - o'shanisi.
 */
export function freeDeliveryText(settings?: Partial<DeliverySettings> | null): string {
  const s = withDeliveryDefaults(settings);
  const custom = (s.note ?? "").trim();
  if (custom) return custom;

  const city = (s.city ?? "").trim();
  const radius = Math.max(0, Math.round(s.freeRadiusKm ?? 0));
  if (city && radius > 0) {
    return `${city} ichida va atrofdagi ${radius} km gacha yetkazib berish bepul.`;
  }
  if (city) return `${city} ichida yetkazib berish bepul.`;
  if (radius > 0) return `${radius} km gacha yetkazib berish bepul.`;
  return "Yetkazib berish xizmati mavjud.";
}

/** Qisqa variant (kartochka, footer, bot tugmasi ostida). */
export function freeDeliveryShort(settings?: Partial<DeliverySettings> | null): string {
  const s = withDeliveryDefaults(settings);
  const note = (s.note ?? "").trim();
  if (note) return note;
  const city = (s.city ?? "").trim();
  const radius = Math.max(0, Math.round(s.freeRadiusKm ?? 0));
  if (city && radius > 0) return `${city} + ${radius} km — bepul yetkazish`;
  if (city) return `${city} ichida bepul yetkazish`;
  return "Bepul yetkazish";
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

/** Mahsulot sahifasidagi qisqa yorliq. */
export const INSTALL_BADGE = "O'rnatib berish xizmati bor";
