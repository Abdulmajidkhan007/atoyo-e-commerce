import { describe, expect, it } from "vitest";
import { buildNameTokens, normalizeSearchWord, searchTermVariants } from "./tokens";

describe("normalizeSearchWord", () => {
  it("kirillchani lotinchaga o'giradi", () => {
    expect(normalizeSearchWord("Душ")).toBe("dush");
    expect(normalizeSearchWord("кран")).toBe("kran");
    expect(normalizeSearchWord("Чойнак")).toBe("choynak");
  });

  it("apostrof va turkcha harflarni tekislaydi", () => {
    expect(normalizeSearchWord("o'lcham")).toBe("olcham");
    expect(normalizeSearchWord("oʻlcham")).toBe("olcham");
    expect(normalizeSearchWord("duş")).toBe("dush");
  });
});

describe("buildNameTokens", () => {
  it("nom, brend va kodni so'zlarga ajratadi", () => {
    const tokens = buildNameTokens("Boou dush 8276", "Boou", "HS897");
    expect(tokens).toContain("dush");
    expect(tokens).toContain("8276");
    expect(tokens).toContain("hs897");
  });

  it("kirillcha nom lotincha qidiruvda ham topiladi", () => {
    expect(buildNameTokens("Душ Боу")).toContain("dush");
  });

  it("bir harfli bo'laklarni tashlaydi va takrorlamaydi", () => {
    const tokens = buildNameTokens("Kran kran a");
    expect(tokens.filter((token) => token === "kran")).toHaveLength(1);
    expect(tokens).not.toContain("a");
  });
});

describe("searchTermVariants", () => {
  it("har bir so'zning ikkala ko'rinishini beradi", () => {
    const variants = searchTermVariants("душ 8276");
    expect(variants).toContain("душ");
    expect(variants).toContain("dush");
    expect(variants).toContain("8276");
  });

  it("Firestore chegarasidan oshmaydi", () => {
    const variants = searchTermVariants("bir ikki uch tort besh olti yetti sakkiz toqqiz un", 12);
    expect(variants.length).toBeLessThanOrEqual(12);
  });
});
