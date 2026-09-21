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

const { loadStorefrontPage, roundRobin } = await import("./storefront");

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

/**
 * ARALASH BIRINCHI EKRAN.
 *
 * Muammo: bir kuni 20 ta bir xil mahsulot kirim qilinsa katalogning
 * butun birinchi ekranini o'sha egallardi (mijoz shikoyati). Bu sof
 * funksiya kategoriyalarni navbatma-navbat qo'yadi.
 */
describe("roundRobin", () => {
  it("har kategoriyadan navbatma-navbat oladi", () => {
    const groups = [["a1", "a2", "a3"], ["b1", "b2"], ["c1"]];
    expect(roundRobin(groups, 6)).toEqual(["a1", "b1", "c1", "a2", "b2", "a3"]);
  });

  it("chegaradan oshmaydi", () => {
    const groups = [["a1", "a2"], ["b1", "b2"]];
    expect(roundRobin(groups, 3)).toEqual(["a1", "b1", "a2"]);
  });

  it("birinchi ekranda kategoriya TAKRORLANMAYDI", () => {
    // 20 ta cho'tka + 2 ta kran: birinchi uchtada uchala kategoriya.
    const brushes = Array.from({ length: 20 }, (_, i) => `cho${i}`);
    const ordered = roundRobin([brushes, ["kran1", "kran2"], ["radiator1"]], 6);
    expect(ordered.slice(0, 3)).toEqual(["cho0", "kran1", "radiator1"]);
  });

  it("bo'sh va tugagan kategoriyalar xalaqit qilmaydi", () => {
    expect(roundRobin([[], ["b1"], []], 5)).toEqual(["b1"]);
    expect(roundRobin([], 5)).toEqual([]);
  });

  it("hech narsani takrorlamaydi", () => {
    const groups = [["a1", "a2"], ["b1"], ["c1", "c2", "c3"]];
    const ordered = roundRobin(groups, 99);
    expect(ordered).toHaveLength(6);
    expect(new Set(ordered).size).toBe(6);
  });
});
