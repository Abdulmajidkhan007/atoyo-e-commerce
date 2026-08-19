import { describe, expect, it } from "vitest";
import { parseIntakeCaption } from "./intake-parser";
import { BUILTIN_TAXONOMY } from "@/lib/products/taxonomy";

const taxonomy = BUILTIN_TAXONOMY;

describe("parseIntakeCaption", () => {
  it("oddiy kirimni o'qiydi", () => {
    const parsed = parseIntakeCaption(
      [
        "PPR quvur 25mm",
        "Kategoriya: quvurlar",
        "Narxi: 45 000",
        "Soni: 120",
        "Sotish turi: metr",
        "Kimdan: Akmal aka",
        "Material: polipropilen",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.missing).toEqual([]);
    expect(parsed.name).toBe("PPR quvur 25mm");
    expect(parsed.price).toBe(45000);
    expect(parsed.stock).toBe(120);
    expect(parsed.variants).toEqual([]);
  });

  it("turlarni o'qiydi: narx eng arzonidan, zaxira yig'indidan", () => {
    const parsed = parseIntakeCaption(
      [
        "Basu moyka",
        "Kategoriya: santexnika",
        "Material: polat",
        "Sotish turi: dona",
        "Kimdan: Akmal aka",
        "Tur nomi: O'lcham",
        "Turlar:",
        "50x60 - 850000 - 4 - BS-5060",
        "60x80 - 990000 - 2",
        "80x100 - 1150000 - 0",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.missing).toEqual([]);
    expect(parsed.variantAxisLabels).toEqual(["O'lcham"]);
    expect(parsed.variants).toHaveLength(3);
    expect(parsed.variants[0]).toEqual({
      values: ["50x60"],
      price: 850000,
      stock: 4,
      sku: "BS-5060",
    });
    // Narx - eng arzon tur, zaxira - hamma turlar yig'indisi.
    expect(parsed.price).toBe(850000);
    expect(parsed.stock).toBe(6);
  });

  it("ikki qatorli turni \"|\" bilan tushunadi", () => {
    const parsed = parseIntakeCaption(
      [
        "Alyuminiy radiator",
        "Kategoriya: radiator",
        "Material: polat",
        "Sotish turi: dona",
        "Kimdan: Bek ota",
        "Tur nomi: Balandlik|Rang",
        "Turlar:",
        "500mm|Oq - 320000 - 3",
        "800mm|Oq - 410000 - 1",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.variantAxisLabels).toEqual(["Balandlik", "Rang"]);
    expect(parsed.variants.map((variant) => variant.values)).toEqual([
      ["500mm", "Oq"],
      ["800mm", "Oq"],
    ]);
    expect(parsed.stock).toBe(4);
  });

  it("turlardan keyin yozilgan kalitli qator ro'yxatni to'xtatadi", () => {
    const parsed = parseIntakeCaption(
      [
        "Basu moyka",
        "Kategoriya: santexnika",
        "Material: polat",
        "Sotish turi: dona",
        "Turlar:",
        "50x60 - 850000 - 4",
        "Kimdan: Akmal aka",
        "Brend: Basu",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.variants).toHaveLength(1);
    expect(parsed.supplier).toBe("Akmal aka");
    expect(parsed.brand).toBe("Basu");
    expect(parsed.missing).toEqual([]);
  });

  it("noto'g'ri tur qatori ogohlantirishga tushadi, qolganlari saqlanadi", () => {
    const parsed = parseIntakeCaption(
      [
        "Basu moyka",
        "Kategoriya: santexnika",
        "Material: polat",
        "Sotish turi: dona",
        "Kimdan: Akmal aka",
        "Tur nomi: O'lcham",
        "Turlar:",
        "50x60 - 850000 - 4",
        "60x80",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.variants).toHaveLength(1);
    expect(parsed.warnings.some((warning) => warning.includes("60x80"))).toBe(true);
  });

  it("turlar bo'lsa umumiy narx/soni yozilmasa ham yetadi", () => {
    const parsed = parseIntakeCaption(
      [
        "Basu moyka",
        "Kategoriya: santexnika",
        "Material: polat",
        "Sotish turi: dona",
        "Kimdan: Akmal aka",
        "Turlar:",
        "50x60 - 850000 - 4",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.missing).toEqual([]);
    expect(parsed.variantAxisLabels).toEqual(["Turi"]);
  });
  // Uch qatorli tur: o'lcham + rang + qalinlik. Qiymatlar "|" bilan
  // va TARTIBI "Tur nomi:" dagi bilan bir xil bo'lishi shart.
  it("uch qatorli turni o'qiydi", () => {
    const parsed = parseIntakeCaption(
      [
        "Basu moyka",
        "Kategoriya: santexnika",
        "Sotish turi: dona",
        "Kimdan: Akmal aka",
        "Tur nomi: O'lcham|Rangi|Qalinlik",
        "Turlar:",
        "50x60|Oq|0.8mm - 96000 - 3 - BS7677",
        "60x80|Qora|1.0mm - 128000 - 4",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.missing).toEqual([]);
    expect(parsed.variantAxisLabels).toEqual(["O'lcham", "Rangi", "Qalinlik"]);
    expect(parsed.variants).toHaveLength(2);
    expect(parsed.variants[0]).toMatchObject({
      values: ["50x60", "Oq", "0.8mm"],
      price: 96000,
      stock: 3,
      sku: "BS7677",
    });
    // Narx eng arzonidan, zaxira yig'indidan.
    expect(parsed.price).toBe(96000);
    expect(parsed.stock).toBe(7);
  });

  it("qiymatlari kam qatorni tashlab, ogohlantiradi", () => {
    const parsed = parseIntakeCaption(
      [
        "Basu moyka",
        "Kategoriya: santexnika",
        "Sotish turi: dona",
        "Kimdan: Akmal aka",
        "Tur nomi: O'lcham|Rangi",
        "Turlar:",
        "50x60|Oq - 96000 - 3",
        "60x80 - 128000 - 4",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.variants).toHaveLength(1);
    expect(parsed.warnings.join(" ")).toContain("mos emas");
  });

  // Material 1C narxnomasidan kelgan mahsulotlarda yozilmaydi -
  // uni talab qilish kirimni to'xtatib qo'yardi.
  it("material yozilmasa ham qabul qiladi", () => {
    const parsed = parseIntakeCaption(
      [
        "PPR quvur 25mm",
        "Kategoriya: quvurlar",
        "Narxi: 45 000",
        "Soni: 120",
        "Sotish turi: metr",
        "Kimdan: Akmal aka",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.missing).toEqual([]);
    expect(parsed.material).toBeNull();
  });
  it("uch qatordan ko'pi qabul qilinmaydi", () => {
    const parsed = parseIntakeCaption(
      [
        "Basu moyka",
        "Kategoriya: santexnika",
        "Sotish turi: dona",
        "Kimdan: Akmal aka",
        "Tur nomi: O'lcham|Rangi|Qalinlik|Turi",
        "Turlar:",
        "50x60|Oq|0.8mm|Chuqur - 96000 - 3",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.variants).toEqual([]);
    expect(parsed.warnings.join(" ")).toContain("3 tadan ko'p bo'lmasin");
    // Turlar qabul qilinmagani uchun narx/soni yetishmaydi deb aytiladi.
    expect(parsed.missing).toContain("price");
  });

  it("qo'shimcha maydonlarni ham o'qiydi (tannarx, kalit, o'rnatish, tarjima)", () => {
    const parsed = parseIntakeCaption(
      [
        "Nomi: Parda+Kovrik",
        "Kodi: Sc-26",
        "Kategoriya: hammom",
        "Tannarx: 68000",
        "Narx: 73000",
        "Soni: 15",
        "Kimdan: Atoyo",
        "Kalit so'zlar: parda, hammom pardasi",
        "O'rnatib berish: ha",
        "Nomi ruscha: Штора",
        "Tavsif ruscha: Размер 180x180",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.costPrice).toBe(68000);
    expect(parsed.price).toBe(73000);
    expect(parsed.keywords).toEqual(["parda", "hammom pardasi"]);
    expect(parsed.installService).toBe(true);
    expect(parsed.nameRu).toBe("Штора");
    expect(parsed.descriptionRu).toBe("Размер 180x180");
  });

  it("o'rnatish xizmati \"yo'q\" bo'lsa false, aytilmasa null", () => {
    const base = ["Nomi: Kran", "Kategoriya: kranlar", "Narx: 10000", "Soni: 1", "Kimdan: Atoyo"];
    expect(
      parseIntakeCaption([...base, "O'rnatib berish: yo'q"].join("\n"), taxonomy).installService
    ).toBe(false);
    expect(parseIntakeCaption(base.join("\n"), taxonomy).installService).toBeNull();
  });
});
