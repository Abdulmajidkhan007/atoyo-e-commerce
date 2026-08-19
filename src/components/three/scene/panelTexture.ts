import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import type { HeroPanel } from "@/lib/hero/usePanelData";

/**
 * SUZUVCHI PANEL MATNI — CANVAS TEKSTURA.
 *
 * NEGA SHUNDAY? Sahna ICHIDAGI matn uchun odatda `troika-three-text`
 * (drei'ning `<Text>` i) ishlatiladi, lekin u shrift FAYLINI talab
 * qiladi va standart holatda uni Google CDN'dan tortadi — saytimizdagi
 * CSP buni bloklaydi (`lib/http/csp.ts`), ya'ni matn umuman
 * ko'rinmasdi. Shrift faylini repoga qo'shish esa yana ~150 KB.
 *
 * Shuning uchun panel 2D canvas'da CHIZILADI (tizim shrifti bilan) va
 * tekstura sifatida 3D tekislikka yopishtiriladi: tashqi fayl yo'q,
 * matn aniq, va butun panel (fon, chegara, yorug'lik) bitta rasmda.
 */

/**
 * Tekstura o'lchami (piksel). Panel nisbati 2:1.
 * Chetlaridagi bo'sh joy ATAYLAB katta: shu'la (glow) aynan shu
 * yerga chiziladi. Ilgari shu'la uchun alohida 3D tekislik qo'yilgan
 * edi va u kadrda katta KULRANG TO'RTBURCHAK bo'lib ko'rinardi.
 */
const WIDTH = 640;
const HEIGHT = 320;
/** Panel chetidan teksturagacha bo'lgan bo'sh joy (shu'la uchun). */
const PAD = 44;

/** Brend ranglari (tailwind.config.ts bilan bir xil). */
const GOLD = "#C49A6C";
const TEXT = "#F4F8FB";
const MUTED = "rgba(230, 240, 248, 0.62)";

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Burchagi yumaloq to'rtburchak (eski brauzerlarda `roundRect` yo'q). */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Uzun matnni panelga sig'diradi (oxiriga "..." qo'yadi). */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 4 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
}

/**
 * Asosiy qiymatni panelga sig'diradi: avval shriftni kichraytiradi,
 * baribir sig'masa ikki qatorga bo'ladi (so'z chegarasi bo'yicha).
 * Chaqiruvchi `ctx.font` ni o'zi qayta qo'yishi shart emas - funksiya
 * tanlangan shriftni qoldiradi.
 */
function wrapValue(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string[] {
  for (const size of [36, 32, 28]) {
    ctx.font = `700 ${size}px ${FONT_STACK}`;
    if (ctx.measureText(value).width <= maxWidth) return [value];
  }

  // Ikki qator: so'zlarni ketma-ket to'ldiramiz.
  ctx.font = `700 30px ${FONT_STACK}`;
  const words = value.split(" ");
  let first = "";
  let index = 0;
  while (index < words.length) {
    const candidate = first ? `${first} ${words[index]}` : words[index]!;
    if (ctx.measureText(candidate).width > maxWidth) break;
    first = candidate;
    index += 1;
  }
  const second = words.slice(index).join(" ");
  if (!first) return [fit(ctx, value, maxWidth)];
  return second ? [first, fit(ctx, second, maxWidth)] : [first];
}

/**
 * Panelni chizadi va teksturani qaytaradi.
 * Chaqiruvchi komponent uni `useMemo` bilan bir marta yasaydi va
 * o'chirilganda `dispose()` qiladi.
 */
export function createPanelTexture(panel: HeroPanel): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;

  const w = WIDTH - PAD * 2;
  const h = HEIGHT - PAD * 2;

  // --- Tashqi shu'la (neon halo) ---
  ctx.save();
  ctx.shadowColor = "rgba(196,154,108,0.55)";
  ctx.shadowBlur = 46;
  roundedRect(ctx, PAD, PAD, w, h, 30);
  ctx.fillStyle = "rgba(7,45,64,0.55)";
  ctx.fill();
  ctx.restore();

  // --- Shisha fon: yuqoridan pastga mayin gradient ---
  const glass = ctx.createLinearGradient(0, PAD, 0, PAD + h);
  glass.addColorStop(0, "rgba(255,255,255,0.16)");
  glass.addColorStop(1, "rgba(255,255,255,0.05)");
  roundedRect(ctx, PAD, PAD, w, h, 30);
  ctx.fillStyle = glass;
  ctx.fill();

  // --- Nozik yorug' chegara ---
  ctx.strokeStyle = "rgba(255,255,255,0.26)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // --- Chap tomondagi oltin "neon" chiziq ---
  ctx.save();
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 20;
  roundedRect(ctx, PAD + 24, PAD + 30, 4, h - 60, 2);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.restore();

  const textX = PAD + 48;
  const maxText = w - 78;

  // --- Sarlavha (kichik, harflar oralig'i keng) ---
  ctx.fillStyle = GOLD;
  ctx.font = `600 21px ${FONT_STACK}`;
  ctx.letterSpacing = "3px";
  ctx.fillText(fit(ctx, panel.label, maxText), textX, PAD + 50);
  ctx.letterSpacing = "0px";

  // --- Asosiy qiymat: kerak bo'lsa shrift KICHRAYADI, keyin ikki
  //     qatorga bo'linadi. Ilgari u shunchaki kesilardi
  //     ("Qo'qon + 15 km — b…"). ---
  ctx.fillStyle = TEXT;
  const lines = wrapValue(ctx, panel.value, maxText);
  lines.forEach((line, index) => {
    ctx.fillText(line, textX, PAD + 104 + index * 42);
  });

  // --- Izoh (qiymat necha qator bo'lsa shunga qarab suriladi) ---
  if (panel.note) {
    ctx.fillStyle = MUTED;
    ctx.font = `400 23px ${FONT_STACK}`;
    ctx.fillText(fit(ctx, panel.note, maxText), textX, PAD + 104 + lines.length * 42 + 14);
  }

  const texture = new CanvasTexture(canvas);
  // Panel kameraga qiya turadi - filtrlar matnni tekis ko'rsatadi.
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
