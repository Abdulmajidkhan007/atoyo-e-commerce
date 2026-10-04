import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const report = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/ops/report-error", () => ({ reportErrorThrottled: report }));

let fail = false;
let pricing: Record<string, unknown> = { retailMarkupPercent: 30, minOrderAmount: 100000 };
let delivery: Record<string, unknown> = { fee: 20000, freeFrom: 500000, enabled: true };
vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({ doc: () => ({ get: read(() => pricing) }) }),
    doc: () => ({ get: read(() => delivery) }),
  }),
}));

function read(data: () => Record<string, unknown>) {
  return async () => {
    if (fail) throw new Error("firestore uzildi");
    return { exists: true, data: data };
  };
}

import { clearPricingCache, getPricingSettings, resetPricingStateForTests } from "./pricing-settings";
import { getDeliverySettings, resetDeliveryStateForTests } from "@/lib/orders/pricing";
import { DEFAULT_PRICING_SETTINGS } from "./wholesale";
import { DEFAULT_DELIVERY_SETTINGS } from "@/types/promo";

beforeEach(() => {
  fail = false;
  report.mockClear();
  resetPricingStateForTests();
  resetDeliveryStateForTests();
});

describe("sozlama o'qilmasa oxirgi muvaffaqiyatli qiymat", () => {
  it("narx: kesh bekor qilingach ham 30% qoladi, xato xabar qilinadi", async () => {
    expect((await getPricingSettings()).retailMarkupPercent).toBe(30);
    clearPricingCache();
    fail = true;
    expect((await getPricingSettings()).retailMarkupPercent).toBe(30);
    expect(report).toHaveBeenCalledTimes(1);
  });

  it("narx: hech qachon o'qilmagan bo'lsa standart", async () => {
    fail = true;
    expect(await getPricingSettings()).toEqual(DEFAULT_PRICING_SETTINGS);
  });

  it("yetkazish: eski qiymat qaytadi", async () => {
    expect((await getDeliverySettings()).fee).toBe(20000);
    fail = true;
    expect((await getDeliverySettings()).fee).toBe(20000);
    expect(report).toHaveBeenCalledTimes(1);
  });

  it("yetkazish: hech qachon o'qilmagan bo'lsa standart", async () => {
    fail = true;
    expect(await getDeliverySettings()).toEqual(DEFAULT_DELIVERY_SETTINGS);
  });
});
