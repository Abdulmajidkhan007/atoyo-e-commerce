import { describe, expect, it } from "vitest";
import { publicDescription } from "./description";

describe("publicDescription", () => {
  it("1C kodini olib tashlaydi, qolganini saqlaydi", () => {
    expect(publicDescription("1C kodi: 5967. Qadoqda: 6 dona")).toBe("Qadoqda: 6 dona");
  });

  it("oxirida turgan 1C kodini ham olib tashlaydi", () => {
    expect(publicDescription("Qadoqda: 6 dona. 1C kodi: 5967")).toBe("Qadoqda: 6 dona.");
  });

  it("faqat 1C kodi bo'lsa bo'sh matn qaytadi", () => {
    expect(publicDescription("1C kodi: 5967")).toBe("");
  });

  it("kirillcha '1С' ni ham taniydi", () => {
    expect(publicDescription("1С код: 5967. Qadoqda: 6 dona")).toBe("Qadoqda: 6 dona");
  });

  it("oddiy tavsifga tegmaydi", () => {
    const text = "Chinni rakovina, o'lchami 60x45 sm. Kafolat 12 oy.";
    expect(publicDescription(text)).toBe(text);
  });

  it("bo'sh qiymatlarda yiqilmaydi", () => {
    expect(publicDescription(undefined)).toBe("");
    expect(publicDescription(null)).toBe("");
    expect(publicDescription("")).toBe("");
  });
});
