import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/products/storefront", () => ({
  loadChipCategories: async () => [
    // Kelajakda funksiya ortiqcha maydon qaytarsa ham javobga chiqmasligi kerak.
    { slug: "kranlar", label: "Kranlar", price: 100, costPrice: 50 },
    { slug: "quvurlar", label: "Quvurlar" },
  ],
}));

import { GET } from "./route";

describe("GET /api/products/chip-categories", () => {
  it("faqat slug va label qaytaradi, narx/tannarx chiqmaydi", async () => {
    const response = await GET();
    const body = await response.json();
    expect(body).toEqual({
      categories: [
        { slug: "kranlar", label: "Kranlar" },
        { slug: "quvurlar", label: "Quvurlar" },
      ],
    });
    expect(JSON.stringify(body)).not.toMatch(/price|cost/i);
  });

  it("ochiq (public) keshlanadi", async () => {
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
  });
});
