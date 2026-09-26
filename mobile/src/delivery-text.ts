/**
 * YETKAZISH VA O'RNATISH MATNI — ilova nusxasi.
 *
 * Ilova sayt kodini import qila olmaydi, shuning uchun mantiq
 * saytdagi `src/lib/delivery/text.ts` dan KO'CHIRILGAN. Ilgari bu
 * nusxa `api.ts` ichida edi va ikkalasini qo'lda bir xil tutish
 * kerak edi. Endi bu fayl hech narsa import qilmaydi (sof), shuning
 * uchun sayt vitest'i ikkalasini YONMA-YON sinaydi
 * (`src/lib/delivery/mobile-parity.test.ts`) — bittasi o'zgarib, ikkinchisi eskicha
 * qolsa test yiqiladi.
 */

export interface DeliveryTextSettings {
  fee: number;
  freeFrom: number;
  enabled: boolean;
  city?: string;
  freeRadiusKm?: number;
  note?: string;
  installEnabled?: boolean;
  installNote?: string;
}

const DEFAULTS: DeliveryTextSettings = {
  fee: 0,
  freeFrom: 0,
  enabled: false,
  city: "Qo'qon",
  freeRadiusKm: 15,
  note: '',
  installEnabled: true,
  installNote: '',
};

const NBSP = ' ';

/** 1234567 -> "1 234 567 so'm" (saytdagi `formatSom` bilan bir xil). */
function som(amount: number): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  const grouped = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${rounded < 0 ? '-' : ''}${grouped} so'm`;
}

function withDefaults(settings?: Partial<DeliveryTextSettings> | null): DeliveryTextSettings {
  return {...DEFAULTS, ...(settings ?? {})};
}

function placePhrase(s: DeliveryTextSettings): string {
  const city = (s.city ?? '').trim();
  const radius = Math.max(0, Math.round(s.freeRadiusKm ?? 0));
  if (city && radius > 0) return `${city} ichida va atrofdagi ${radius} km gacha`;
  if (city) return `${city} ichida`;
  if (radius > 0) return `${radius} km gacha`;
  return '';
}

function paidTerms(s: DeliveryTextSettings): {fee: number; freeFrom: number} | null {
  if (!s.enabled || s.fee <= 0) return null;
  return {fee: s.fee, freeFrom: Math.max(0, s.freeFrom)};
}

function capitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

export function freeDeliveryText(settings?: Partial<DeliveryTextSettings> | null): string {
  const s = withDefaults(settings);
  const custom = (s.note ?? '').trim();
  if (custom) return custom;

  const place = placePhrase(s);
  const terms = paidTerms(s);
  if (terms && terms.freeFrom > 0) {
    const rule = `${som(terms.freeFrom)}dan boshlab yetkazib berish bepul, undan kam buyurtmaga — ${som(terms.fee)}.`;
    return place ? `${place}: ${rule}` : capitalize(rule);
  }
  if (terms) {
    return place ? `${place} yetkazib berish — ${som(terms.fee)}.` : `Yetkazib berish — ${som(terms.fee)}.`;
  }
  if (place) return `${place} yetkazib berish bepul.`;
  return 'Yetkazib berish xizmati mavjud.';
}

export function installServiceText(settings?: Partial<DeliveryTextSettings> | null): string | null {
  const s = withDefaults(settings);
  if (s.installEnabled === false) return null;
  const custom = (s.installNote ?? '').trim();
  if (custom) return custom;
  const city = (s.city ?? '').trim();
  const near = city ? `${city} va atrofidagi mijozlarga` : 'yaqin mijozlarga';
  return `Moyka, dush kabina va shunga o'xshash mahsulotlarni o'rnatib berish xizmati bor — ${near}. Buyurtma berayotganda ayting.`;
}
