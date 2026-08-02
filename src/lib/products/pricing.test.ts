import { describe, expect, it } from "vitest";
import { effectivePrice, isDiscountActive } from "./pricing";

const DAY = 24 * 60 * 60 * 1000;

describe("isDiscountActive", () => {
  it("chegirma narxi yo'q bo'lsa - yo'q", () => {
    expect(isDiscountActive({ price: 100, discountPrice: null, discountUntil: null })).toBe(false);
  });

  it("chegirma asosiy narxdan arzon bo'lishi kerak", () => {
    expect(isDiscountActive({ price: 100, discountPrice: 120, discountUntil: null })).toBe(false);
    expect(isDiscountActive({ price: 100, discountPrice: 80, discountUntil: null })).toBe(true);
  });

  it("muddati o'tgan chegirma amal qilmaydi", () => {
    expect(isDiscountActive({ price: 100, discountPrice: 80, discountUntil: Date.now() - DAY })).toBe(false);
    expect(isDiscountActive({ price: 100, discountPrice: 80, discountUntil: Date.now() + DAY })).toBe(true);
  });
});

describe("effectivePrice", () => {
  it("chegirma amal qilsa - chegirma narxi", () => {
    expect(effectivePrice({ price: 100, discountPrice: 80, discountUntil: null })).toBe(80);
  });

  it("muddati o'tgan bo'lsa - to'liq narx", () => {
    expect(effectivePrice({ price: 100, discountPrice: 80, discountUntil: Date.now() - DAY })).toBe(100);
  });
});
