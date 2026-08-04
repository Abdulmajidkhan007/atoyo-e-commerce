import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRICING_SETTINGS,
  markupFor,
  priceForRole,
  productPricesForRole,
  retailFromWholesale,
} from "./wholesale";

describe("optom va dona narx", () => {
  it("dona narx ustama bilan hisoblanadi va 100 so'mgacha yaxlitlanadi", () => {
    expect(retailFromWholesale(100_000, 5)).toBe(105_000);
    // 87 300 × 1.05 = 91 665 -> 91 700
    expect(retailFromWholesale(87_300, 5)).toBe(91_700);
  });

  it("optom mijoz bazadagi narxni ko'radi", () => {
    expect(priceForRole(100_000, "client", 5)).toBe(100_000);
    expect(priceForRole(100_000, "user", 5)).toBe(105_000);
    // Kirmagan mijoz ham dona narxni ko'radi.
    expect(priceForRole(100_000, undefined, 5)).toBe(105_000);
  });

  it("mahsulotning o'z ustamasi umumiy sozlamadan ustun", () => {
    expect(markupFor({ retailMarkupPercent: 12 }, DEFAULT_PRICING_SETTINGS)).toBe(12);
    expect(markupFor({ retailMarkupPercent: null }, DEFAULT_PRICING_SETTINGS)).toBe(5);
  });

  it("chegirma narxi ham xuddi shu qoidada o'giriladi", () => {
    const prices = productPricesForRole(
      { price: 200_000, discountPrice: 180_000, discountUntil: null, retailMarkupPercent: null },
      "user",
      DEFAULT_PRICING_SETTINGS
    );
    expect(prices).toEqual({ price: 210_000, discountPrice: 189_000 });
  });
});
