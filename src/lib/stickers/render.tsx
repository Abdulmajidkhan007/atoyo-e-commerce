import { ImageResponse } from "next/og";
import type { StickerTemplate } from "@/types/sticker";

/**
 * STIKER RASMINI YASASH (tashqi xizmatsiz, `next/og` bilan).
 *
 * Telegram statik stiker talabi: PNG yoki WEBP, tomonlaridan biri
 * ANIQ 512px, hajmi 512KB gacha. Shuning uchun har doim 512x512
 * chiziladi.
 *
 * Do'kondagi mavjud stikerlar uslubi asos qilib olingan: to'q ko'k
 * doira, oltin urg'u, pastda oq lentada "ATOYO".
 *
 * EMOJI ISHLATILMAYDI - `next/og` ularni chiza olmaydi (loyiha
 * qoidasi). Emoji stikerning "kayfiyati" sifatida alohida beriladi.
 */

export const STICKER_SIZE = 512;

const NAVY = "#0B3B54";
const NAVY_DARK = "#04202F";
const GOLD = "#C49A6C";
const WHITE = "#FFFFFF";

export interface StickerDesign {
  template: StickerTemplate;
  /** Asosiy yozuv (2-3 so'z eng chiroyli chiqadi). */
  text: string;
  /** Ikkinchi qator (ixtiyoriy, kichikroq). */
  subtitle?: string;
  /** Asosiy yozuv rangi. */
  color?: string;
  /** Pastdagi "ATOYO" lentasi chizilsinmi. */
  withLogo?: boolean;
}

/** Yozuv uzunligiga qarab shrift o'lchami - matn ramkadan chiqmasin. */
function fontSizeFor(text: string, max: number, min: number): number {
  const longest = text
    .split(/\s+/)
    .reduce((acc, word) => Math.max(acc, word.length), 0);
  const byLength = Math.round(max - (text.length - 8) * 2.6);
  const byWord = Math.round((max * 9) / Math.max(6, longest));
  return Math.max(min, Math.min(max, byLength, byWord));
}

/** Pastdagi oq lenta ("ATOYO") - do'kon stikerlaridagi kabi. */
function LogoRibbon({ width }: { width: number }) {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        bottom: 0,
        left: (STICKER_SIZE - width) / 2,
        width,
        height: 92,
        background: WHITE,
        borderRadius: `${width}px ${width}px 0 0`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: 6,
          color: NAVY_DARK,
          // Bundled shriftda "bold" varianti yo'q - qalinlik kontur
          // (text-stroke) bilan beriladi, do'kon stikerlaridagidek.
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
  const text = (design.text || "").trim().slice(0, 60);
  const subtitle = (design.subtitle || "").trim().slice(0, 60);
  const color = design.color || WHITE;
  const withLogo = design.withLogo !== false;

  const titleSize = fontSizeFor(text, design.template === "banner" ? 76 : 68, 30);
  const subtitleSize = Math.max(22, Math.round(titleSize * 0.46));

  const body = (
    <div
      style={{
        display: "flex",
        width: STICKER_SIZE,
        height: STICKER_SIZE,
        alignItems: "center",
        justifyContent: "center",
        // Stiker foni SHAFFOF - Telegram uni yumaloq/qirqilgan holda
        // ko'rsatadi (do'kon stikerlaridagi kabi).
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
          width: design.template === "banner" ? STICKER_SIZE : 496,
          height: design.template === "banner" ? 320 : 496,
          padding: design.template === "banner" ? "0 30px" : "40px 44px 110px",
          background:
            design.template === "banner"
              ? `linear-gradient(135deg, ${GOLD} 0%, #8A6640 100%)`
              : `linear-gradient(150deg, ${NAVY} 0%, ${NAVY_DARK} 100%)`,
          border: design.template === "banner" ? "none" : `10px solid ${WHITE}`,
          borderRadius:
            design.template === "circle" ? 248 : design.template === "badge" ? 72 : 44,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: titleSize,
            lineHeight: 1.08,
            fontWeight: 800,
            WebkitTextStrokeWidth: 2.5,
            WebkitTextStrokeColor: design.template === "banner" ? NAVY_DARK : color,
            color: design.template === "banner" ? NAVY_DARK : color,
            textAlign: "center",
            maxWidth: 400,
          }}
        >
          {text}
        </div>

        {subtitle && (
          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: subtitleSize,
              fontWeight: 700,
              WebkitTextStrokeWidth: 1,
              WebkitTextStrokeColor: design.template === "banner" ? "#3A2A1B" : GOLD,
              color: design.template === "banner" ? "#3A2A1B" : GOLD,
              textAlign: "center",
              maxWidth: 400,
            }}
          >
            {subtitle}
          </div>
        )}

        {withLogo && design.template !== "banner" && <LogoRibbon width={300} />}
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
