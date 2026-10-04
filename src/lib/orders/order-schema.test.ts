import { describe, expect, it } from "vitest";
import { MAX_GUEST_ITEMS, orderErrorMessage, quickOrderSchema } from "./order-schema";

const valid = {
  customerName: "Abdulloh Sharipov",
  phoneNumber: "+998 99 999 02 22",
  items: [{ productId: "p1", name: "Lipuchka", price: 4000, quantity: 1, thumbnailUrl: "" }],
  deliveryAddress: "Qo'qon, Navbahor 45",
  paymentMethod: "transfer",
};

describe("1 klikda buyurtma sxemasi", () => {
  it("to'liq ma'lumot qabul qilinadi", () => {
    expect(quickOrderSchema.safeParse(valid).success).toBe(true);
  });

  it("manzilsiz buyurtma rad etiladi va sabab mijozga tushunarli", () => {
    const result = quickOrderSchema.safeParse({ ...valid, deliveryAddress: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(orderErrorMessage(result.error)).toBe("Manzilni to'liqroq yozing.");
  });

  it("mehmon onlayn to'lovni tanlay olmaydi (faqat naqd yoki o'tkazma)", () => {
    expect(quickOrderSchema.safeParse({ ...valid, paymentMethod: "online" }).success).toBe(false);
  });

  it("noto'g'ri telefon — o'zbekcha xabar, ichki maydon nomi chiqmaydi", () => {
    const result = quickOrderSchema.safeParse({ ...valid, phoneNumber: "123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = orderErrorMessage(result.error);
      expect(message).toBe("Telefon raqam noto'g'ri.");
      expect(message).not.toContain("phoneNumber");
    }
  });
});

describe("1 klikda — suiiste'molga qarshi chegaralar (tekshiruvchi D1)", () => {
  it("savat (bir necha qator) qabul qilinadi, MAX_GUEST_ITEMS dan ko'pi — yo'q", () => {
    const two = { ...valid, items: [...valid.items, { ...valid.items[0]!, productId: "p2" }] };
    expect(quickOrderSchema.safeParse(two).success).toBe(true);
    const tooMany = {
      ...valid,
      items: Array.from({ length: MAX_GUEST_ITEMS + 1 }, (_, i) => ({ ...valid.items[0]!, productId: `p${i}` })),
    };
    expect(quickOrderSchema.safeParse(tooMany).success).toBe(false);
  });

  it("bir mahsulot takror qatorda — rad (zaxira limitini aylanib o'tib bo'lmasin)", () => {
    const dup = { ...valid, items: [valid.items[0]!, valid.items[0]!] };
    expect(quickOrderSchema.safeParse(dup).success).toBe(false);
  });

  it("99 donadan ko'p rad etiladi (zaxirani bir so'rovda nolga tushirib bo'lmasin)", () => {
    const many = { ...valid, items: [{ ...valid.items[0]!, quantity: 100 }] };
    expect(quickOrderSchema.safeParse(many).success).toBe(false);
    const ok = { ...valid, items: [{ ...valid.items[0]!, quantity: 99 }] };
    expect(quickOrderSchema.safeParse(ok).success).toBe(true);
  });
});
