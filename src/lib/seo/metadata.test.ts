import { describe, expect, it } from "vitest";
import { cityFromAddress, siteDescription } from "./metadata";

/**
 * Sabab: sayt tavsifida "Toshkent bo'ylab yetkazib berish" deb
 * QOTIRIB yozilgan edi, do'kon esa Qo'qonda. Telegram va Google
 * kartochkasida noto'g'ri shahar ko'rinardi va uni admin paneldan
 * tuzatib bo'lmasdi.
 */
describe("cityFromAddress", () => {
  it("vergulli manzildan shaharni oladi", () => {
    expect(cityFromAddress("Qo'qon, Navbahor ko'chasi 45p")).toBe("Qo'qon");
  });

  it("“shahri” qo'shimchasini olib tashlaydi", () => {
    expect(cityFromAddress("Toshkent shahri")).toBe("Toshkent");
    expect(cityFromAddress("Qo'qon shahar, Navbahor 45")).toBe("Qo'qon");
  });

  it("bo'sh manzilda bo'sh satr", () => {
    expect(cityFromAddress("")).toBe("");
    expect(cityFromAddress(undefined)).toBe("");
    expect(cityFromAddress(null)).toBe("");
  });
});

describe("siteDescription", () => {
  it("shahar nomini manzildan oladi", () => {
    const text = siteDescription("Qo'qon, Navbahor ko'chasi 45p");
    expect(text).toContain("Qo'qon shahrida");
    // Boshqa shahar nomi qotirib yozilmagan bo'lsin.
    expect(text).not.toContain("Toshkent");
    expect(text).not.toContain("Ташкент");
  });

  it("manzil bo'lmasa shaharsiz ishlaydi", () => {
    const text = siteDescription();
    expect(text).toContain("10 000+ mahsulot");
    expect(text).not.toContain("shahrida");
  });
});
