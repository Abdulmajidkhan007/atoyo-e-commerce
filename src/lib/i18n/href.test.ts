import { describe, expect, it } from "vitest";
import { localeHref, stripLocalePrefix } from "./href";

describe("localeHref", () => {
  it("o'zbekcha uchun manzilni o'zgartirmaydi (prefiks'siz)", () => {
    expect(localeHref("/katalog", "uz")).toBe("/katalog");
    expect(localeHref("/", "uz")).toBe("/");
  });

  it("ruscha uchun /ru prefiksini qo'shadi", () => {
    expect(localeHref("/katalog", "ru")).toBe("/ru/katalog");
    expect(localeHref("/", "ru")).toBe("/ru");
    expect(localeHref("/mahsulot/123?category=faucets", "ru")).toBe(
      "/ru/mahsulot/123?category=faucets"
    );
  });

  it("tashqi/nisbiy havolalarga tegmaydi", () => {
    for (const external of ["https://t.me/atoyo", "mailto:a@b.uz", "tel:+998901234567", "#top", "katalog"]) {
      expect(localeHref(external, "ru")).toBe(external);
    }
    // Ochiq yo'naltirish zaifligidan himoya: "//" bilan boshlanuvchi ham tegilmaydi.
    expect(localeHref("//saxta.uz", "ru")).toBe("//saxta.uz");
  });
});

describe("stripLocalePrefix", () => {
  it("prefiks'siz manzilni o'zbekcha deb oladi", () => {
    expect(stripLocalePrefix("/katalog")).toEqual({ locale: "uz", path: "/katalog" });
  });

  it("/ru prefiksini ajratadi", () => {
    expect(stripLocalePrefix("/ru/katalog")).toEqual({ locale: "ru", path: "/katalog" });
    expect(stripLocalePrefix("/ru")).toEqual({ locale: "ru", path: "/" });
  });

  it("localeHref bilan bir-birining teskarisi (round-trip)", () => {
    for (const path of ["/", "/katalog", "/mahsulot/42"]) {
      for (const locale of ["uz", "ru"] as const) {
        expect(stripLocalePrefix(localeHref(path, locale))).toEqual({ locale, path });
      }
    }
  });
});
