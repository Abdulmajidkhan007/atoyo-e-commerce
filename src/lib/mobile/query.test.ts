import { describe, expect, it } from "vitest";
import { buildQuery } from "../../../mobile/src/query";

describe("buildQuery (ilova)", () => {
  it("bo'sh qiymatlarni tashlaydi va kodlaydi", () => {
    expect(
      buildQuery({ pageSize: 20, category: "Kranlar va aralashtirgichlar", brand: undefined, cursor: null, q: "" })
    ).toBe("pageSize=20&category=Kranlar%20va%20aralashtirgichlar");
  });

  it("maxsus belgilar", () => {
    expect(buildQuery({ q: "o'q & 1/2\"" })).toBe("q=o'q%20%26%201%2F2%22");
  });
});
