import { ImageResponse } from "next/og";
import { GOLD, NAVY_DARK, WHITE, iconArt, logoMark } from "./art";
import type { StickerTemplate } from "@/types/sticker";

/**
 * STIKER RASMINI YASASH (tashqi xizmatsiz, `next/og` bilan).
 *
 * Do'konning HAQIQIY stikerlari asos qilib olingan:
 *
 *     ┌──────────────┐   • oq halqa ichida to'q ko'k doira
 *     │   ✦ ikonka   │   • yuqorida oltin chiziqli ikonka
 *     │  KATTA YOZUV │   • o'rtada oq qalin yozuv (1-3 qator)
 *     │  kichik izoh │   • ostida kichik oltin izoh
 *     │  ◟ ATOYO ◞   │   • pastda oq linza + ATOYO logotipi
 *     └──────────────┘
 *
 * Telegram talabi: PNG/WEBP, tomonlaridan biri ANIQ 512px.
 *
 * EMOJI ISHLATILMAYDI - satori ularni chiza olmaydi. Uning o'rniga
 * vektor ikonkalar bor (`art.ts`).
 */

export const STICKER_SIZE = 512;

const NAVY = "#0B3B54";

export interface StickerDesign {
  template: StickerTemplate;
  /** Asosiy yozuv (2-3 so'z eng chiroyli chiqadi). */
  text: string;
  /** Ikkinchi qator (ixtiyoriy, kichikroq, oltin rangda). */
  subtitle?: string;
  /** Yuqoridagi ikonka nomi (`art.ts`), "none" - ikonkasiz. */
  icon?: string;
  /** Asosiy yozuv rangi. */
  color?: string;
  /** Pastdagi ATOYO linzasi chizilsinmi. */
  withLogo?: boolean;
  /**
   * Ikonka o'rniga qo'yiladigan tayyor rasm (AI chizgani).
   * `data:image/...` ko'rinishida bo'lishi kerak.
   */
  artDataUrl?: string;
}

/** Yozuv uzunligiga qarab shrift o'lchami - matn ramkadan chiqmasin. */
function fontSizeFor(text: string, max: number, min: number): number {
  const lines = Math.max(1, Math.ceil(text.length / 16));
  const longest = text.split(/\s+/).reduce((acc, word) => Math.max(acc, word.length), 0);
  const byLength = Math.round(max - (text.length - 10) * 1.8);
  const byWord = Math.round((max * 9.5) / Math.max(7, longest));
  const byLines = Math.round(max - (lines - 1) * 9);
  return Math.max(min, Math.min(max, byLength, byWord, byLines));
}

/**
 * Pastdagi oq LINZA (ikki tomoni uchli oval) va uning ichida
 * ATOYO logotipi - do'kon stikerlaridagi kabi.
 */
function LogoLens() {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        bottom: -8,
        left: 74,
        width: 348,
        height: 116,
        background: WHITE,
        // Ikki tomoni uchli "linza" shakli.
        borderRadius: "50%",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingBottom: 14,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoMark("dark")} width={54} height={47} alt="" />
      <div
        style={{
          display: "flex",
          fontSize: 46,
          letterSpacing: 4,
          color: NAVY_DARK,
          WebkitTextStrokeWidth: 1.6,
          WebkitTextStrokeColor: NAVY_DARK,
        }}
      >
        ATOYO
      </div>
    </div>
  );
}

export function stickerImage(design: StickerDesign): ImageResponse {
  const text = (design.text || "").trim().slice(0, 70);
  const subtitle = (design.subtitle || "").trim().slice(0, 70);
  const color = design.color || WHITE;
  const withLogo = design.withLogo !== false;
  const art = design.artDataUrl || (design.icon && design.icon !== "none" ? iconArt(design.icon) : null);

  const isBanner = design.template === "banner";
  const titleSize = fontSizeFor(text, isBanner ? 74 : 62, 28);
  const subtitleSize = Math.max(20, Math.round(titleSize * 0.42));

  const body = (
    <div
      style={{
        display: "flex",
        width: STICKER_SIZE,
        height: STICKER_SIZE,
        alignItems: "center",
        justifyContent: "center",
        // Stiker foni SHAFFOF - Telegram uni chat foniga qo'yadi.
        background: "transparent",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          width: isBanner ? STICKER_SIZE : 496,
          height: isBanner ? 300 : 496,
          padding: isBanner ? "0 34px" : `${art ? 26 : 48}px 40px ${withLogo ? 104 : 48}px`,
          background: isBanner
            ? `linear-gradient(135deg, ${GOLD} 0%, #8A6640 100%)`
            : `linear-gradient(155deg, #10465F 0%, ${NAVY} 45%, ${NAVY_DARK} 100%)`,
          // Oq halqa - do'kon stikerlarining eng ko'zga tashlanadigan qismi.
          border: isBanner ? "none" : `9px solid ${WHITE}`,
          borderRadius: design.template === "circle" ? 248 : isBanner ? 40 : 76,
          textAlign: "center",
        }}
      >
        {/* Yuqoridagi ikonka yoki AI chizgan rasm */}
        {art && !isBanner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art}
            width={design.artDataUrl ? 190 : 118}
            height={design.artDataUrl ? 190 : 118}
            alt=""
            style={{ marginBottom: 10, objectFit: "contain" }}
          />
        )}

        <div
          style={{
            display: "flex",
            fontSize: titleSize,
            lineHeight: 1.1,
            letterSpacing: 0.5,
            WebkitTextStrokeWidth: 2.6,
            WebkitTextStrokeColor: isBanner ? NAVY_DARK : color,
            color: isBanner ? NAVY_DARK : color,
            textAlign: "center",
            maxWidth: 396,
          }}
        >
          {text}
        </div>

        {subtitle && (
          <div
            style={{
              display: "flex",
              marginTop: 10,
              fontSize: subtitleSize,
              WebkitTextStrokeWidth: 1,
              WebkitTextStrokeColor: isBanner ? "#3A2A1B" : GOLD,
              color: isBanner ? "#3A2A1B" : GOLD,
              textAlign: "center",
              maxWidth: 380,
              lineHeight: 1.15,
            }}
          >
            {subtitle}
          </div>
        )}

        {withLogo && !isBanner && <LogoLens />}
      </div>
    </div>
  );

  return new ImageResponse(body, { width: STICKER_SIZE, height: STICKER_SIZE });
}

/** Rasm baytlari (Telegram'ga yuklash uchun). */
export async function stickerPng(design: StickerDesign): Promise<Buffer> {
  const image = stickerImage(design);
  return Buffer.from(await image.arrayBuffer());
}
