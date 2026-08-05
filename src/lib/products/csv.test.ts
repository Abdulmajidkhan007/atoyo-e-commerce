import { describe, expect, it } from "vitest";
import { normalizeHeader, parseCsv, productsToCsv, variantsFromRows, type VariantRow } from "./csv";
import type { Product } from "@/types/product";

/** Testlar uchun eng kichik mahsulot. */
function makeProduct(extra: Partial<Product> = {}): Product {
  return {
    id: "p1",
    slug: "moyka-p1",
    name: "Basu moyka",
    nameSearchIndex: "basu moyka",
    description: "",
    category: "sanitary-ware",
    brand: "Basu",
    manufacturerCountry: "Xitoy",
    material: "steel",
    unit: "dona",
    dimensions: {},
    price: 850000,
    currency: "UZS",
    stock: 6,
    images: [],
    thumbnailUrl: "",
    isActive: true,
    createdAt: 0,
    updatedAt: 0,
    salesCount: 0,
    ...extra,
  } as Product;
}

describe("normalizeHeader", () => {
  it("inglizcha nomlarni o'zgartirmaydi", () => {
    expect(normalizeHeader("price")).toBe("price");
    expect(normalizeHeader(" variantValue ")).toBe("variantValue");
  });

  it("o'zbekcha sarlavhalarni tarjima qiladi", () => {
    expect(normalizeHeader("Nomi")).toBe("name");
    expect(normalizeHeader("Narxi")).toBe("price");
    expect(normalizeHeader("Zaxira")).toBe("stock");
    expect(normalizeHeader("Turi")).toBe("variantGroup");
    expect(normalizeHeader("Razmer")).toBe("variantValue");
    expect(normalizeHeader("O'lcham")).toBe("variantValue");
  });

  it("notanish sarlavha o'zicha qoladi", () => {
    expect(normalizeHeader("qandaydir ustun")).toBe("qandaydir ustun");
  });
});

describe("parseCsv", () => {
  it("o'zbekcha sarlavhali faylni ham o'qiydi", () => {
    const rows = parseCsv("Nomi,Narxi,Zaxira\nBasu moyka,850000,4\n");
    expect(rows).toEqual([{ name: "Basu moyka", price: "850000", stock: "4" }]);
  });
});

describe("variantsFromRows", () => {
  const rows: VariantRow[] = [
    { lineNo: 2, row: { name: "Basu moyka", variantGroup: "O'lcham", variantValue: "50x60", price: "850000", stock: "4", variantSku: "BS-5060" } },
    { lineNo: 3, row: { name: "Basu moyka", variantGroup: "O'lcham", variantValue: "60x80", price: "990000", stock: "2" } },
  ];

  it("har bir qatordan bitta tur yasaydi", () => {
    const { axes, variants, errors } = variantsFromRows(rows);
    expect(errors).toEqual([]);
    expect(axes).toHaveLength(1);
    expect(axes[0]!.label).toBe("O'lcham");
    expect(axes[0]!.values).toEqual(["50x60", "60x80"]);
    expect(variants.map((v) => v.price)).toEqual([850000, 990000]);
    expect(variants[0]!.sku).toBe("BS-5060");
    expect(variants[0]!.id).toBe("50x60");
  });

  it("ikki o'lchovli turni \"|\" bilan tushunadi", () => {
    const { axes, variants } = variantsFromRows([
      { lineNo: 2, row: { variantGroup: "Balandlik|Rang", variantValue: "500mm|Oq", price: "320000", stock: "3" } },
      { lineNo: 3, row: { variantGroup: "Balandlik|Rang", variantValue: "800mm|Oq", price: "410000", stock: "1" } },
    ]);
    expect(axes.map((axis) => axis.label)).toEqual(["Balandlik", "Rang"]);
    expect(axes[1]!.values).toEqual(["Oq"]);
    expect(variants[0]!.id).toBe("500mm|Oq");
  });

  it("qiymatlar soni mos kelmasa - o'sha qator xatoga tushadi", () => {
    const { variants, errors } = variantsFromRows([
      ...rows,
      { lineNo: 4, row: { variantGroup: "O'lcham", variantValue: "80x100|Oq", price: "1150000" } },
    ]);
    expect(variants).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("4-qator");
  });

  it("narxsiz tur qabul qilinmaydi (chernovikda esa mayli)", () => {
    const noPrice = [{ lineNo: 2, row: { variantGroup: "O'lcham", variantValue: "50x60", stock: "4" } }];
    expect(variantsFromRows(noPrice).errors).toHaveLength(1);
    expect(variantsFromRows(noPrice, { requirePrice: false }).variants).toHaveLength(1);
  });

  it("tur qatorlari yo'q bo'lsa - bo'sh natija", () => {
    expect(variantsFromRows([{ lineNo: 2, row: { name: "PPR quvur", price: "45000" } }])).toEqual({
      axes: [],
      variants: [],
      errors: [],
    });
  });
});

describe("productsToCsv", () => {
  it("turlari bor mahsulotni har bir tur uchun alohida qator qilib yozadi", () => {
    const csv = productsToCsv([
      makeProduct({
        variantAxes: [{ key: "olcham", label: "O'lcham", values: ["50x60", "60x80"] }],
        variants: [
          { id: "50x60", options: { olcham: "50x60" }, price: 850000, discountPrice: null, stock: 4, sku: "BS-5060" },
          { id: "60x80", options: { olcham: "60x80" }, price: 990000, discountPrice: null, stock: 2 },
        ],
      }),
    ]);

    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3); // sarlavha + 2 tur
    expect(lines[1]).toContain("50x60");
    expect(lines[1]).toContain("850000");
    expect(lines[2]).toContain("60x80");
  });

  it("tursiz mahsulot bitta qator bo'ladi", () => {
    const csv = productsToCsv([makeProduct()]);
    expect(csv.trim().split("\n")).toHaveLength(2);
  });

  it("eksport qilingan qatorlarni qayta o'qiganda turlar tiklanadi", () => {
    const csv = productsToCsv([
      makeProduct({
        variantAxes: [{ key: "olcham", label: "O'lcham", values: ["50x60", "60x80"] }],
        variants: [
          { id: "50x60", options: { olcham: "50x60" }, price: 850000, discountPrice: null, stock: 4 },
          { id: "60x80", options: { olcham: "60x80" }, price: 990000, discountPrice: null, stock: 2 },
        ],
      }),
    ]);

    const parsed = parseCsv(csv).map((row, index) => ({ row, lineNo: index + 2 }));
    const { axes, variants } = variantsFromRows(parsed);
    expect(axes[0]!.values).toEqual(["50x60", "60x80"]);
    expect(variants.map((v) => v.stock)).toEqual([4, 2]);
  });
});
