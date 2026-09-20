import { describe, expect, it, vi } from "vitest";
import type { Product } from "@/types/product";

/**
 * KATALOGNING SERVER RENDERI — NARX MAXFIYLIGI.
 *
 * Bu funksiya mahsulotni to'g'ridan-to'g'ri HTMLga chiqaradi, ya'ni
 * xato qilinsa OPTOM NARX va TANNARX sahifa manbasida qolib ketadi va
 * uni raqobatchi bir bosishda ko'radi. Shuning uchun `toViewerProducts`
 * dan o'tishi shu yerda qulflanadi.
 */

const raw: Product[] = [
  {
    id: "p1",
    name: "Smesitel",
    price: 100000,
    costPrice: 80000,
    supplier: "Akmal aka",
    stock: 5,
    category: "faucets",
    isActive: true,
    currency: "UZS",
    images: [],
  } as unknown as Product,
];

vi.mock("./catalog-server", () => ({
  queryProductsPage: async () => ({ products: raw, nextCursor: "p1", hasMore: true }),
}));
vi.mock("./pricing-settings", () => ({
  getPricingSettings: async () => ({ retailMarkupPercent: 5 }),
}));
vi.mock("@/lib/firebase/session", () => ({ getCurrentAppUser: async () => null }));
vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: () => ({}) }));
vi.mock("./taxonomy-server", () => ({ getTaxonomy: async () => ({ categories: [] }) }));

const { loadStorefrontPage } = await import("./storefront");

describe("loadStorefrontPage", () => {
  it("tannarx va yetkazib beruvchini OLIB TASHLAYDI", async () => {
    const page = await loadStorefrontPage({});
    const product = page.products[0]!;
    expect(product).not.toHaveProperty("costPrice");
    expect(product).not.toHaveProperty("supplier");
    expect(product).not.toHaveProperty("retailMarkupPercent");
  });

  it("narxni DONA narxga o'giradi (optom emas)", async () => {
    const page = await loadStorefrontPage({});
    expect(page.products[0]!.price).toBe(105000);
  });

  it("kursor va hasMore uzatiladi (cheksiz skroll davom etsin)", async () => {
    const page = await loadStorefrontPage({});
    expect(page.nextCursor).toBe("p1");
    expect(page.hasMore).toBe(true);
  });
});
