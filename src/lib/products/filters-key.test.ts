import { describe, expect, it } from "vitest";
import { catalogFiltersKey, filtersFromSearchParams } from "./filters-key";

describe("catalogFiltersKey", () => {
  it("standart saralash (`newest`) va bo'sh qiymatlar teng hisoblanadi", () => {
    expect(catalogFiltersKey({})).toBe(catalogFiltersKey({ sortBy: "newest" }));
  });

  it("kategoriya farq qilsa kalit ham farq qiladi (asl nosozlik)", () => {
    expect(catalogFiltersKey({ category: "faucets" })).not.toBe(catalogFiltersKey({}));
  });

  it("qidiruv matni kalitga KIRMAYDI (u alohida yo'l bilan ishlaydi)", () => {
    const withSearch = { sortBy: "newest", searchTerm: "kran" } as Parameters<typeof catalogFiltersKey>[0];
    expect(catalogFiltersKey(withSearch)).toBe(catalogFiltersKey({}));
  });
});

describe("filtersFromSearchParams", () => {
  it("manzildagi filtrlarni o'qiydi, bo'shlarini tashlaydi", () => {
    const params = new URLSearchParams("category=faucets&brand=&country=Xitoy");
    expect(filtersFromSearchParams(params)).toEqual({ category: "faucets", manufacturerCountry: "Xitoy" });
  });

  it("filtr bo'lmasa bo'sh obyekt", () => {
    expect(filtersFromSearchParams(new URLSearchParams(""))).toEqual({});
  });
});
