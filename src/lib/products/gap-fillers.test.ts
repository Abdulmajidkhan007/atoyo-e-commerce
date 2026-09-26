import { describe, expect, it } from "vitest";
import { rankGapFillers, type GapCandidate } from "./gap-fillers";

const item = (id: string, category: string, shownPrice: number, extra: Partial<GapCandidate> = {}): GapCandidate => ({
  id,
  category,
  shownPrice,
  stock: 5,
  hasImage: true,
  ...extra,
});

describe("rankGapFillers", () => {
  const GAP = 46000;

  it("faqat BITTA qo'shish bilan farqni yopadiganlar chiqadi", () => {
    const result = rankGapFillers([item("arzon", "x", 20000), item("yetadi", "x", 46000)], {
      gap: GAP,
      cartCategories: [],
      exclude: [],
    });
    expect(result.map((r) => r.id)).toEqual(["yetadi"]);
  });

  it("savatdagi kategoriyadan bo'lsa yuqorida", () => {
    const result = rankGapFillers([item("boshqa", "kran", 47000), item("mos", "xostovar", 60000)], {
      gap: GAP,
      cartCategories: ["xostovar"],
      exclude: [],
    });
    expect(result.map((r) => r.id)).toEqual(["mos", "boshqa"]);
  });

  it("farqdan juda oshib ketgan qimmat mahsulot pastda", () => {
    const result = rankGapFillers([item("qimmat", "x", 900000), item("munosib", "x", 55000)], {
      gap: GAP,
      cartCategories: [],
      exclude: [],
    });
    expect(result.map((r) => r.id)).toEqual(["munosib", "qimmat"]);
  });

  it("zaxirasiz, rasmsiz va savatdagilar chiqmaydi", () => {
    const result = rankGapFillers(
      [
        item("tugagan", "x", 50000, { stock: 0 }),
        item("rasmsiz", "x", 50000, { hasImage: false }),
        item("savatda", "x", 50000),
        item("yaxshi", "x", 50000),
      ],
      { gap: GAP, cartCategories: [], exclude: ["savatda"] }
    );
    expect(result.map((r) => r.id)).toEqual(["yaxshi"]);
  });

  it("farq 0 bo'lsa hech narsa taklif qilinmaydi", () => {
    expect(rankGapFillers([item("a", "x", 50000)], { gap: 0, cartCategories: [], exclude: [] })).toEqual([]);
  });
});
