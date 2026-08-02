import { describe, expect, it } from "vitest";
import { deliveryFeeFor, normalizePromoCode, promoDiscount, validatePromo } from "./promo";
import type { DeliverySettings, PromoCode } from "@/types/promo";

const promo: PromoCode = {
  code: "ATOYO10",
  type: "percent",
  value: 10,
  minOrderAmount: 100000,
  maxUses: 5,
  usedCount: 0,
  expiresAt: null,
  isActive: true,
  createdAt: 0,
  updatedAt: 0,
};

const delivery: DeliverySettings = { enabled: true, fee: 20000, freeFrom: 500000 };

describe("normalizePromoCode", () => {
  it("bosh harflarga o'giradi va bo'shliqni oladi", () => {
    expect(normalizePromoCode(" atoyo10 ")).toBe("ATOYO10");
  });
});

describe("promoDiscount", () => {
  it("foizli chegirma", () => {
    expect(promoDiscount(promo, 200000)).toBe(20000);
  });

  it("qat'iy summa chegirmasi buyurtmadan oshmaydi", () => {
    expect(promoDiscount({ ...promo, type: "fixed", value: 300000 }, 200000)).toBe(200000);
  });
});

describe("validatePromo", () => {
  it("topilmagan / o'chirilgan kod", () => {
    expect(validatePromo(null, 200000)).toEqual({ ok: false, error: "not-found" });
    expect(validatePromo({ ...promo, isActive: false }, 200000)).toEqual({ ok: false, error: "inactive" });
  });

  it("muddati va limiti", () => {
    expect(validatePromo({ ...promo, expiresAt: 1000 }, 200000, 2000)).toEqual({ ok: false, error: "expired" });
    expect(validatePromo({ ...promo, usedCount: 5 }, 200000)).toEqual({ ok: false, error: "used-up" });
  });

  it("eng kam summa sharti", () => {
    expect(validatePromo(promo, 50000)).toEqual({ ok: false, error: "min-amount" });
  });

  it("hammasi joyida bo'lsa chegirmani qaytaradi", () => {
    expect(validatePromo(promo, 200000)).toEqual({ ok: true, discount: 20000 });
  });
});

describe("deliveryFeeFor", () => {
  it("o'chirilgan bo'lsa - bepul", () => {
    expect(deliveryFeeFor({ ...delivery, enabled: false }, 100000)).toBe(0);
  });

  it("chegaradan oshsa - bepul", () => {
    expect(deliveryFeeFor(delivery, 500000)).toBe(0);
    expect(deliveryFeeFor(delivery, 499999)).toBe(20000);
  });
});
