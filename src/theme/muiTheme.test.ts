import { describe, expect, it } from "vitest";
import { WCAG_AA_NORMAL, contrastRatio, flatten, type Rgb } from "@/lib/a11y/contrast";
import type { CssVarsTheme } from "@mui/material/styles";
import { muiTheme } from "./muiTheme";

// `createTheme` tipida CSS o'zgaruvchilari maydonlari yo'q — ular
// `cssVariables` berilganda qo'shiladi.
const theme = muiTheme as unknown as CssVarsTheme;

/**
 * MUI PALITRASI `.dark` KLASSIGA BOG'LANGAN (`docs/ARXITEKTURA-TARIXI.md`
 * 40-band).
 *
 * Ilgari sovuq ochilishda tungi rejimda `<html class="dark">` va sahifa
 * foni to'q, MUI esa YORUG' palitrada qolardi — forma yorlig'i
 * `rgba(0,0,0,.6)` to'q fonda 1.32:1 (/kontakt) va 1.53:1 (/kirish)
 * berardi. Bu test (1) palitra JS holatiga emas, `.dark` klassiga
 * bog'langanini va (2) har sxemada yorliq/matn o'z fonida AA dan
 * o'tishini O'LCHAYDI.
 */

type Scheme = "light" | "dark";

function palette(scheme: Scheme) {
  const p = theme.colorSchemes[scheme]?.palette;
  if (!p) throw new Error(`colorSchemes.${scheme} yo'q`);
  return p;
}

/** `rgba(r, g, b, a)` yoki `#hex` → fon ustidagi yakuniy rang. */
function solid(color: string, over: string): Rgb | string {
  const inner = color.match(/^rgba?\(([^)]+)\)$/)?.[1];
  if (!inner) return color;
  const [r, g, b, a = "1"] = inner.split(",").map((x) => x.trim());
  const hex = `#${[r, g, b].map((v) => Number(v).toString(16).padStart(2, "0")).join("")}`;
  return flatten(hex, Number(a), over);
}

describe("MUI temasi — CSS o'zgaruvchilari, `.dark` klassi", () => {
  it("tungi sxema `.dark` klassi bilan tanlanadi (redux holati bilan EMAS)", () => {
    expect(theme.getColorSchemeSelector("dark")).toBe(".dark &");
    expect(theme.vars).toBeDefined();
  });

  it("ikkala sxema ham bor va fon ranglari brend palitrasida", () => {
    expect(palette("light").background.default).toBe("#FFFFFF");
    expect(palette("light").background.paper).toBe("#F3F7FA");
    expect(palette("dark").background.default).toBe("#072D40");
    expect(palette("dark").background.paper).toBe("#0B3B54");
  });
});

describe("forma yorlig'i va matn — har sxemada o'z fonida AA", () => {
  for (const scheme of ["light", "dark"] as const) {
    const p = palette(scheme);
    for (const bg of [p.background.default, p.background.paper]) {
      it(`${scheme}: yorliq (text.secondary) ${bg} fonida o'qiladi`, () => {
        expect(contrastRatio(solid(p.text.secondary, bg), bg)).toBeGreaterThanOrEqual(
          WCAG_AA_NORMAL
        );
      });
      it(`${scheme}: asosiy matn (text.primary) ${bg} fonida o'qiladi`, () => {
        expect(contrastRatio(solid(p.text.primary, bg), bg)).toBeGreaterThanOrEqual(
          WCAG_AA_NORMAL
        );
      });
    }
  }

  it("ESKI NOSOZLIK: yorug' yorliq to'q fonda o'qilmaydi — sxemalar aralashmasligi shart", () => {
    const label = palette("light").text.secondary;
    const darkBg = palette("dark").background.default;
    // Audit o'lchovi: /kontakt da 1.32:1.
    expect(contrastRatio(solid(label, darkBg), darkBg)).toBeLessThan(2);
  });
});
