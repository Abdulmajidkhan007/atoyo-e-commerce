import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("o'zbekcha apostrofni olib tashlaydi", () => {
    expect(slugify("Yangi o'lcham")).toBe("yangi-olcham");
  });

  it("kirill harflarini saqlaydi (avval ular butunlay yo'qolardi)", () => {
    expect(slugify("Радиатор")).toBe("радиатор");
  });

  it("bo'sh natijada berilgan zaxira qiymatni qaytaradi", () => {
    expect(slugify("!!!", { fallback: "mahsulot" })).toBe("mahsulot");
    expect(slugify("", { fallback: "post" })).toBe("post");
  });

  it("zaxira berilmasa ham bo'sh qaytarmaydi", () => {
    expect(slugify("!!!").length).toBeGreaterThan(0);
  });

  it("uzunlikni cheklaydi va oxiridagi chiziqchani qoldirmaydi", () => {
    const long = slugify("bir ikki uch tort besh olti yetti sakkiz toqqiz on");
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long.endsWith("-")).toBe(false);
  });
});
