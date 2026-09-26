import { describe, expect, it } from "vitest";
import { freeDeliveryGap, freeDeliveryShort, freeDeliveryText, installServiceText } from "./text";

describe("yetkazish va'dasi", () => {
  it("standart holatda shahar va radiusni aytadi", () => {
    expect(freeDeliveryText()).toContain("Qo'qon");
    expect(freeDeliveryText()).toContain("15 km");
    expect(freeDeliveryShort()).toContain("15 km");
  });

  it("admin yozgan matn ustun turadi", () => {
    expect(freeDeliveryText({ note: "Butun viloyatga bepul." })).toBe("Butun viloyatga bepul.");
  });

  it("radius 0 bo'lsa faqat shahar aytiladi", () => {
    expect(freeDeliveryText({ freeRadiusKm: 0 })).toBe("Qo'qon ichida yetkazib berish bepul.");
  });

  it("o'rnatish xizmati o'chirilgan bo'lsa matn yo'q", () => {
    expect(installServiceText({ installEnabled: false })).toBeNull();
    expect(installServiceText()).toContain("o'rnatib berish");
  });

  it("o'rnatish izohi yozilgan bo'lsa o'shanisi", () => {
    expect(installServiceText({ installNote: "Faqat moyka." })).toBe("Faqat moyka.");
  });
});

/**
 * SHARTLI BEPUL YETKAZISH.
 *
 * Savol (egasidan): "4 000 so'mlik lipuchkani ham bepul olib
 * boramizmi? Taksiga o'zi 15 000 ketadi." Matn endi chegarani aytadi.
 */
describe("pullik yetkazish va chegara", () => {
  const PAID = { enabled: true, fee: 15000, freeFrom: 50000 };

  it("chegara bo'lsa matn uni va narxni aytadi", () => {
    expect(freeDeliveryText(PAID)).toBe(
      "Qo'qon ichida va atrofdagi 15 km gacha: 50\u00A0000 so'mdan boshlab yetkazib berish bepul, undan kam buyurtmaga — 15\u00A0000 so'm."
    );
    expect(freeDeliveryShort(PAID)).toBe("Qo'qon + 15 km — 50\u00A0000 so'mdan bepul yetkazish");
  });

  it("yetkazish o'chiq bo'lsa (enabled: false) — avvalgidek shartsiz bepul", () => {
    expect(freeDeliveryText({ ...PAID, enabled: false })).toBe(
      "Qo'qon ichida va atrofdagi 15 km gacha yetkazib berish bepul."
    );
  });

  it("chegarasiz pullik yetkazish", () => {
    expect(freeDeliveryText({ enabled: true, fee: 15000, freeFrom: 0 })).toBe(
      "Qo'qon ichida va atrofdagi 15 km gacha yetkazib berish — 15\u00A0000 so'm."
    );
  });

  it("\"X so'm qoldi\" hisobi", () => {
    expect(freeDeliveryGap(PAID, 4000)).toEqual({ remaining: 46000, progress: 8, freeFrom: 50000, fee: 15000 });
    expect(freeDeliveryGap(PAID, 50000)?.remaining).toBe(0);
    expect(freeDeliveryGap(PAID, 80000)?.progress).toBe(100);
    // Chegara yo'q yoki yetkazish bepul - chiziq umuman chiqmaydi.
    expect(freeDeliveryGap({ enabled: false, fee: 15000, freeFrom: 50000 }, 4000)).toBeNull();
    expect(freeDeliveryGap({ enabled: true, fee: 15000, freeFrom: 0 }, 4000)).toBeNull();
  });
});
