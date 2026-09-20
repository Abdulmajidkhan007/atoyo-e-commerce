import { describe, expect, it } from "vitest";
import {
  WCAG_AA_NON_TEXT,
  WCAG_AA_NORMAL,
  contrastRatio,
  flatten,
  parseHex,
} from "./contrast";

/**
 * PALITRA KONTRASTI QULFLANADI.
 *
 * `docs/QULAYLIK.md` va `docs/UI-SHISHA.md` §5 talabi: matn/fon
 * nisbati 4.5:1 dan past bo'lmasin. Bu test shu talabni O'LCHAYDI —
 * `tailwind.config.ts` yoki `globals.css` dagi rang o'zgartirilsa va
 * kontrast tushsa, test yiqiladi va sabab ko'rinib turadi.
 *
 * Qiymatlar ikki joyda takrorlanmasin degan qoidani buzmaslik uchun
 * FAQAT kontrast muhim bo'lgan juftliklar yozilgan.
 */

/** Bir joyda: brend palitrasining kontrast uchun muhim qismi. */
const COLORS = {
  white: "#FFFFFF",
  navy50: "#EDF4F8",
  navy100: "#C9DCE6",
  navy200: "#A8C6D6",
  navy500: "#175071",
  navy600: "#104462",
  navy700: "#0B3B54",
  navy900: "#072D40",
  /** Yorug' temadagi ikkinchi darajali matn (`--color-navy-300`). */
  mutedLight: "#44748F",
  /** Tungi temadagi ikkinchi darajali matn (`--color-navy-300`). */
  mutedDark: "#93B8CC",
  /** `--color-bg-elevated` — shisha ishlamaganda tushadigan fon. */
  elevatedLight: "#F3F7FA",
  aqua300: "#DCC09A",
  aqua500: "#C49A6C",
  aqua600: "#8A6640",
  /** Fokus halqasi (`--focus-ring`). */
  focusLight: "#0B3B54",
  focusDark: "#DCC09A",
} as const;

describe("contrastRatio", () => {
  it("chekka qiymatlarni to'g'ri hisoblaydi", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("tartibga bog'liq emas", () => {
    expect(contrastRatio(COLORS.navy900, COLORS.white)).toBeCloseTo(
      contrastRatio(COLORS.white, COLORS.navy900),
      5
    );
  });

  it("qisqa HEX ni ham tushunadi", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
  });
});

describe("ikkinchi darajali matn (text-navy-300) — AA", () => {
  // ESLATMA: eski qiymat #5E8CA6 oq fonda atigi 3.63:1 berardi.
  const lightBackgrounds = [COLORS.white, COLORS.navy50, COLORS.elevatedLight];
  for (const background of lightBackgrounds) {
    it(`yorug' temada ${background} fonida o'qiladi`, () => {
      expect(contrastRatio(COLORS.mutedLight, background)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL
      );
    });
  }

  const darkBackgrounds = [COLORS.navy900, COLORS.navy700, COLORS.navy600];
  for (const background of darkBackgrounds) {
    it(`tungi temada ${background} fonida o'qiladi`, () => {
      expect(contrastRatio(COLORS.mutedDark, background)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL
      );
    });
  }
});

describe("doimiy TO'Q bloklar (footer, ilova kartochkasi)", () => {
  it("navy-200 navy-900 fonida o'qiladi", () => {
    // Footer tema yorug' bo'lsa ham to'q qoladi, shuning uchun u yerda
    // `text-navy-300` EMAS, qattiq `text-navy-200` ishlatiladi.
    expect(contrastRatio(COLORS.navy200, COLORS.navy900)).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL
    );
  });

  it("navy-100 navy-900 fonida o'qiladi", () => {
    expect(contrastRatio(COLORS.navy100, COLORS.navy900)).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL
    );
  });
});

describe("brend urg'u rangi", () => {
  it("havola rangi (aqua-600) oq fonda o'qiladi", () => {
    expect(contrastRatio(COLORS.aqua600, COLORS.white)).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL
    );
  });

  it("havola rangi (aqua-300) to'q fonda o'qiladi", () => {
    expect(contrastRatio(COLORS.aqua300, COLORS.navy900)).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL
    );
  });

  it("to'ldirilgan tugmadagi matn (navy-900 / aqua-500) o'qiladi", () => {
    // MUI `primary.contrastText` = #072D40, foni #C49A6C.
    expect(contrastRatio(COLORS.navy900, COLORS.aqua500)).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL
    );
  });
});

describe("shisha (glass) qatlami — docs/UI-SHISHA.md §5", () => {
  /** `--glass-nav-bg` yorug' temada: rgba(245,245,247,.9) oq ustida. */
  const navLight = flatten("#F5F5F7", 0.9, COLORS.white);
  /** Tungi temada: rgba(28,28,30,.9) navy-900 ustida. */
  const navDark = flatten("#1C1C1E", 0.9, COLORS.navy900);

  it("so'nik matn (--glass-fg-muted) yorug' temada AA dan past emas", () => {
    // Alfa 0.6 da 3.34:1 edi - shuning uchun 0.75 ga ko'tarilgan.
    const muted = flatten("#3C3C43", 0.75, navLight);
    expect(contrastRatio(muted, navLight)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it("so'nik matn tungi temada AA dan past emas", () => {
    const muted = flatten("#EBEBF5", 0.6, navDark);
    expect(contrastRatio(muted, navDark)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it("asosiy matn (--glass-fg) ikkala temada ham o'qiladi", () => {
    expect(contrastRatio("#1C1C1E", navLight)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    expect(contrastRatio("#F2F2F7", navDark)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it("pastki navigatsiyadagi FAOL bo'lim rangi o'qiladi", () => {
    expect(contrastRatio("#6B4E31", navLight)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    expect(contrastRatio(COLORS.aqua300, navDark)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });
});

describe("klaviatura fokusi halqasi — matn emas, 3:1 yetarli", () => {
  it("yorug' temada oq va navy-50 fonida ko'rinadi", () => {
    expect(contrastRatio(COLORS.focusLight, COLORS.white)).toBeGreaterThanOrEqual(
      WCAG_AA_NON_TEXT
    );
    expect(contrastRatio(COLORS.focusLight, COLORS.navy50)).toBeGreaterThanOrEqual(
      WCAG_AA_NON_TEXT
    );
  });

  it("yorug' temada brend tugmasining ustida ham ko'rinadi", () => {
    expect(contrastRatio(COLORS.focusLight, COLORS.aqua500)).toBeGreaterThanOrEqual(
      WCAG_AA_NON_TEXT
    );
  });

  it("to'q fonda (footer, tungi tema) ochroq halqa ko'rinadi", () => {
    expect(contrastRatio(COLORS.focusDark, COLORS.navy900)).toBeGreaterThanOrEqual(
      WCAG_AA_NON_TEXT
    );
    expect(contrastRatio(COLORS.focusDark, COLORS.navy700)).toBeGreaterThanOrEqual(
      WCAG_AA_NON_TEXT
    );
  });

  it("to'q halqa to'q fonda KO'RINMAYDI - shuning uchun footer'da almashtirilgan", () => {
    // Bu "teskari" tekshiruv: qoidaning sababi kodda qolsin.
    expect(contrastRatio(COLORS.focusLight, COLORS.navy900)).toBeLessThan(
      WCAG_AA_NON_TEXT
    );
  });
});

describe("palitra qiymatlari globals.css bilan mos", () => {
  it("navy-300 tokenlari CSS dagi qiymat bilan bir xil", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(
      new URL("../../app/globals.css", import.meta.url),
      "utf8"
    );
    // Yorug' tema - `:root`, tungi - `.dark`. Ikkalasi ham shu test
    // kutgan qiymatda turishi kerak, aks holda yuqoridagi o'lchovlar
    // haqiqiy saytga taalluqli bo'lmay qoladi.
    expect(css).toContain(`--color-navy-300: ${COLORS.mutedLight};`);
    expect(css).toContain(`--color-navy-300: ${COLORS.mutedDark};`);
    expect(css).toContain(`--focus-ring: ${COLORS.focusLight};`);
    expect(css).toContain(`--focus-ring: ${COLORS.focusDark};`);
  });

  it("tailwind navy-300 ni CSS o'zgaruvchisidan oladi", async () => {
    const { readFileSync } = await import("node:fs");
    const config = readFileSync(
      new URL("../../../tailwind.config.ts", import.meta.url),
      "utf8"
    );
    expect(config).toContain('300: "var(--color-navy-300)"');
  });
});
