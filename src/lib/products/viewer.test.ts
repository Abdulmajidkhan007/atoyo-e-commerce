import { describe, expect, it } from "vitest";
import {
  filterPriceToWholesale,
  staffSeesInternal,
  storefrontRole,
  toViewerProduct,
} from "./viewer";
import type { Product } from "@/types/product";

const PRICING = { retailMarkupPercent: 20 };

function makeProduct(extra: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Smesitel",
    description: "",
    category: "smesitel",
    brand: "Atoyo",
    manufacturerCountry: "Xitoy",
    material: "metall",
    unit: "dona",
    dimensions: {},
    price: 100_000,
    costPrice: 70_000,
    supplier: "Toshkent bazasi",
    retailMarkupPercent: null,
    discountPrice: null,
    currency: "UZS",
    stock: 5,
    images: [],
    thumbnailUrl: "",
    isActive: true,
    createdAt: 1,
    updatedAt: 1,
    ...extra,
  } as Product;
}

describe("toViewerProduct", () => {
  it("dona mijozga USTAMA QO'SHILGAN narx beradi", () => {
    const view = toViewerProduct(makeProduct(), "user", PRICING);
    expect(view.price).toBe(120_000);
  });

  it("optom mijozga optom narx beradi", () => {
    const view = toViewerProduct(makeProduct(), "client", PRICING);
    expect(view.price).toBe(100_000);
  });

  it("kirmagan mehmonga dona narx beradi", () => {
    const view = toViewerProduct(makeProduct(), undefined, PRICING);
    expect(view.price).toBe(120_000);
  });

  it("TANNARX, USTAMA FOIZI va YETKAZIB BERUVCHI mijozga ketmaydi", () => {
    for (const role of ["user", "client", undefined] as const) {
      const view = toViewerProduct(makeProduct(), role, PRICING);
      // Bular bo'lmasligi SHART: ustama foizi ma'lum bo'lsa dona
      // narxdan optom narx teskari hisoblanib qolardi.
      expect(view).not.toHaveProperty("costPrice");
      expect(view).not.toHaveProperty("retailMarkupPercent");
      expect(view).not.toHaveProperty("supplier");
    }
  });

  it("xodimga hujjat o'zgarmagan holda beriladi", () => {
    for (const role of ["admin", "owner"] as const) {
      const view = toViewerProduct(makeProduct(), role, PRICING);
      expect(view.price).toBe(100_000);
      expect(view.costPrice).toBe(70_000);
      expect(view.retailMarkupPercent).toBeNull();
    }
  });

  it("mahsulotning O'Z ustamasi umumiy sozlamadan ustun turadi", () => {
    const view = toViewerProduct(makeProduct({ retailMarkupPercent: 50 }), "user", PRICING);
    expect(view.price).toBe(150_000);
  });

  it("chegirma ham rolga qarab hisoblanadi", () => {
    const view = toViewerProduct(makeProduct({ discountPrice: 90_000 }), "user", PRICING);
    expect(view.discountPrice).toBe(108_000);
  });

  it("muddati o'tgan chegirma umuman berilmaydi", () => {
    const view = toViewerProduct(
      makeProduct({ discountPrice: 90_000, discountUntil: Date.now() - 1000 }),
      "user",
      PRICING
    );
    expect(view.discountPrice).toBeNull();
  });

  it("turlarning narxi ham o'giriladi, tannarxi olib tashlanadi", () => {
    const view = toViewerProduct(
      makeProduct({
        variants: [
          { id: "50x60", options: { olcham: "50x60" }, price: 200_000, costPrice: 150_000, stock: 3 },
        ],
      }),
      "user",
      PRICING
    );
    const variant = view.variants?.[0];
    expect(variant?.price).toBe(240_000);
    expect(variant).not.toHaveProperty("costPrice");
  });
});

describe("filterPriceToWholesale", () => {
  it("dona mijozning filtri optom qiymatga o'giriladi", () => {
    // Mijoz "120 000 gacha" deydi; bazada optom narx turadi.
    expect(filterPriceToWholesale(120_000, "user", PRICING)).toBe(100_000);
  });

  it("optom mijoz va xodim filtri o'zgarmaydi", () => {
    expect(filterPriceToWholesale(120_000, "client", PRICING)).toBe(120_000);
    expect(filterPriceToWholesale(120_000, "admin", PRICING)).toBe(120_000);
  });

  it("ustama 0 bo'lsa qiymat o'zgarmaydi", () => {
    expect(filterPriceToWholesale(120_000, "user", { retailMarkupPercent: 0 })).toBe(120_000);
  });
});

describe("staffSeesInternal", () => {
  it("faqat owner va admin", () => {
    expect(staffSeesInternal("owner")).toBe(true);
    expect(staffSeesInternal("admin")).toBe(true);
    expect(staffSeesInternal("client")).toBe(false);
    expect(staffSeesInternal("user")).toBe(false);
    expect(staffSeesInternal(undefined)).toBe(false);
  });
});

describe("storefrontRole", () => {
  /**
   * Sabab: admin sifatida kirilgan holda SAYTDA optom narx (70 000)
   * ko'rinardi, botda esa dona narx (78 700) - bu chalkashlik edi.
   * Vitrina hamma uchun MIJOZ oynasi bo'lishi kerak.
   */
  it("xodim ham vitrinada mijoz narxini ko'radi", () => {
    expect(storefrontRole("admin")).toBe("user");
    expect(storefrontRole("owner")).toBe("user");
  });

  it("optom mijoz optom narxda qoladi", () => {
    expect(storefrontRole("client")).toBe("client");
  });

  it("kirmagan mehmon - dona narx", () => {
    expect(storefrontRole(undefined)).toBe("user");
    expect(storefrontRole("user")).toBe("user");
  });

  it("vitrinada admin ham dona narx va tannarxsiz hujjat oladi", () => {
    const view = toViewerProduct(makeProduct(), storefrontRole("admin"), PRICING);
    expect(view.price).toBe(120_000);
    expect(view).not.toHaveProperty("costPrice");
  });
});
