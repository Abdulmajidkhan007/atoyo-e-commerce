import { describe, expect, it, vi } from "vitest";

/**
 * KANAL POSTI MATNI.
 *
 * Turli mahsulotda qator "kod · qiymat — narx" bo'lib chiqardi va
 * qaysi narx qaysi kodga tegishli ekani bilinmasdi. Endi tartib:
 * QIYMAT — NARX · kod. Shu tartib buzilmasligi uchun test.
 */

vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: () => ({}) }));
vi.mock("@/lib/firebase/admin-content", () => ({ getSiteSettings: async () => ({}) }));
vi.mock("@/lib/products/taxonomy-server", () => ({ getTaxonomy: async () => ({ categories: [], materials: [], units: [] }) }));
vi.mock("@/lib/notifications/push", () => ({ sendPushToTopic: async () => {}, PRODUCTS_TOPIC: "products" }));
vi.mock("@/lib/products/pricing-settings", () => ({ getPricingSettings: async () => ({ retailMarkupPercent: 5 }) }));
vi.mock("./bot", () => ({
  sendChatMessage: async () => ({ message_id: 1 }),
  sendMediaGroup: async () => [],
  editMessageCaptionOrText: async () => {},
  deleteMessage: async () => {},
}));

const { buildProductText } = await import("./channel");
const { formatSom } = await import("@/lib/format");

const base = {
  id: "p1",
  slug: "venus",
  name: "Venus Kalta Quyma",
  nameSearchIndex: "venus kalta quyma",
  description: "",
  sku: "SJ-03",
  category: "smestitellar",
  brand: "Venus",
  manufacturerCountry: "Xitoy",
  supplier: "",
  material: "",
  unit: "dona",
  dimensions: {},
  price: 86100,
  costPrice: null,
  discountPrice: null,
  discountUntil: null,
  currency: "UZS" as const,
  stock: 7,
  images: [],
  videos: [],
  thumbnailUrl: "",
  isActive: true,
  salesCount: 0,
  createdAt: 0,
  updatedAt: 0,
};

const withVariants = {
  ...base,
  variantAxes: [{ key: "rangi", label: "Rangi", values: ["Satin Gold", "Gunsmoke gray"] }],
  variants: [
    {
      id: "Satin Gold",
      options: { rangi: "Satin Gold" },
      price: 91400,
      discountPrice: null,
      stock: 5,
      sku: "SJ-03 Ruskin",
    },
    {
      id: "Gunsmoke gray",
      options: { rangi: "Gunsmoke gray" },
      price: 86100,
      discountPrice: null,
      stock: 0,
      sku: "SJ-03 Mokriy",
    },
  ],
};

describe("buildProductText", () => {
  it("tur qatorida avval qiymat, keyin narx, oxirida kod turadi", () => {
    const text = buildProductText(withVariants, "new", "Smestitellar");
    // `formatSom` ajratgichi oddiy bo'shliq emas - shuning uchun
    // kutilgan matn ham shu funksiyadan yasaladi.
    expect(text).toContain(`Satin Gold — <b>${formatSom(91400)}</b> · kod: <code>SJ-03 Ruskin</code>`);
    // Kod qiymatdan OLDIN turmasin (eski chalkash ko'rinish).
    expect(text).not.toContain("<code>SJ-03 Ruskin</code> · Satin Gold");
  });

  it("bitta qator bo'lsa sarlavha o'sha qatorning nomi", () => {
    expect(buildProductText(withVariants, "new")).toContain("🔀 <b>Rangi:</b>");
  });

  it("ikki qator bo'lsa sarlavha \"Turlari\"", () => {
    const twoAxes = {
      ...withVariants,
      variantAxes: [
        { key: "olcham", label: "O'lcham", values: ["10"] },
        { key: "hajmi", label: "Hajmi", values: ["Kalta"] },
      ],
    };
    expect(buildProductText(twoAxes, "new")).toContain("🔀 <b>Turlari:</b>");
  });

  it("kategoriya nomi brenddan keyin chiqadi", () => {
    const text = buildProductText(base, "new", "Smestitellar");
    const brandAt = text.indexOf("🏷 Venus");
    const categoryAt = text.indexOf("📂 Smestitellar");
    const priceAt = text.indexOf("💰");
    expect(brandAt).toBeGreaterThan(-1);
    expect(categoryAt).toBeGreaterThan(brandAt);
    expect(priceAt).toBeGreaterThan(categoryAt);
  });

  it("turlari bo'lsa umumiy kod takrorlanmaydi", () => {
    expect(buildProductText(withVariants, "new")).not.toContain("#️⃣ Kod:");
    // Turlari yo'q mahsulotda esa kod ko'rinadi.
    expect(buildProductText(base, "new")).toContain("#️⃣ Kod:");
  });

  it("tugagan tur belgilanadi", () => {
    expect(buildProductText(withVariants, "new")).toContain("· tugagan");
  });

  it("qo'shimcha qator (o'rnatish xizmati) tavsifdan oldin turadi", () => {
    const withAbout = { ...base, description: "Qisqa tavsif" };
    const text = buildProductText(withAbout, "new", "", ["🛠 <b>O'rnatib berish xizmati bor</b>"]);
    const installAt = text.indexOf("🛠");
    expect(installAt).toBeGreaterThan(-1);
    // Tavsif eng oxirida qoladi.
    expect(text.indexOf("Qisqa tavsif")).toBeGreaterThan(installAt);
  });
});
