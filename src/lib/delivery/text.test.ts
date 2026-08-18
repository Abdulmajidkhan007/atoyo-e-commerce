import { describe, expect, it } from "vitest";
import { freeDeliveryShort, freeDeliveryText, installServiceText } from "./text";

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
