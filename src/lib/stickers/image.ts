import "server-only";
import sharp from "sharp";

/**
 * RASMNI TELEGRAM STIKERIGA AYLANTIRISH.
 *
 * AI (yoki mahsulot surati) qaytargan rasm oddiy to'rtburchak,
 * fonli bo'ladi. Haqiqiy stiker esa:
 *   • 512x512 (Telegram talabi),
 *   • foni SHAFFOF,
 *   • atrofida oq chegara (shundan u har qanday chat foniga
 *     tushganda ham ajralib turadi - "premium" ko'rinish shundan).
 *
 * Hammasi `sharp` bilan qilinadi - tashqi xizmat yoki ffmpeg kerak
 * emas. Natija WEBP (PNG dan ancha yengil, Telegram ikkalasini ham
 * qabul qiladi).
 */

export const SIZE = 512;
/** Telegram statik stiker chegarasi. */
const MAX_BYTES = 512 * 1024;

export interface StickerImageOptions {
  /** Natija formati: `webp` (yuklash uchun) yoki `png` (shablonga qo'yish). */
  output?: "webp" | "png";
  /** Fonni olib tashlash (chekkadan bir xil rangni "to'kib" chiqish). */
  removeBackground?: boolean;
  /** Atrofidagi oq chegara qalinligi (0 - chegarasiz). */
  outline?: number;
  /** Fon rangini aniqlashda ruxsat etilgan farq (0-255). */
  tolerance?: number;
}

/**
 * FONNI OLIB TASHLASH.
 *
 * Chekka piksellardan boshlab "to'kib chiqamiz" (flood fill): rangi
 * chekkadagiga yaqin bo'lgan qo'shni piksellar fon deb belgilanadi.
 * Bu mahsulot ichidagi oq joylarni (masalan chinni rakovina) saqlab
 * qoladi - ular chekkaga tutashmagani uchun tegilmaydi.
 */
function floodFillBackground(
  data: Buffer,
  width: number,
  height: number,
  tolerance: number
): void {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const push = (index: number) => {
    if (index < 0 || index >= total || visited[index]) return;
    visited[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  // Chekkadagi rang - fon rangi deb qabul qilinadi (o'rtacha).
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;
  for (let x = 0; x < width; x += 1) {
    for (const y of [0, height - 1]) {
      const offset = (y * width + x) * 4;
      sumR += data[offset]!;
      sumG += data[offset + 1]!;
      sumB += data[offset + 2]!;
      count += 1;
    }
  }
  const bg = [sumR / count, sumG / count, sumB / count];

  // Boshlanish nuqtalari - butun chekka.
  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head]!;
    head += 1;
    const offset = index * 4;

    const diff =
      Math.abs(data[offset]! - bg[0]!) +
      Math.abs(data[offset + 1]! - bg[1]!) +
      Math.abs(data[offset + 2]! - bg[2]!);
    if (diff > tolerance * 3) continue;

    data[offset + 3] = 0; // shaffof

    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
  }
}

/** Rasmni 512x512 stikerga aylantiradi (WEBP baytlari). */
export async function toStickerImage(
  input: Buffer,
  options: StickerImageOptions = {}
): Promise<Buffer> {
  const tolerance = options.tolerance ?? 26;
  const outline = options.outline ?? 14;

  // 1) O'lchamga keltiramiz - chetlari shaffof qoladi.
  const base = await sharp(input)
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(base.data);
  if (options.removeBackground !== false) {
    floodFillBackground(pixels, base.info.width, base.info.height, tolerance);
  }

  const subject = await sharp(pixels, {
    raw: { width: base.info.width, height: base.info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  if (outline <= 0) return finish(subject, options.output);

  // 2) OQ CHEGARA: alfa kanalni "yoyib" (blur + threshold) kattaroq
  //    siluet yasaymiz va uni oq qilib, ostiga qo'yamiz.
  const mask = await sharp(subject)
    .extractChannel("alpha")
    .blur(Math.max(0.3, outline / 3))
    .threshold(40)
    .toBuffer();

  const halo = await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .joinChannel(mask, { raw: { width: SIZE, height: SIZE, channels: 1 } })
    .png()
    .toBuffer();

  const composed = await sharp(halo)
    .composite([{ input: subject }])
    .png()
    .toBuffer();

  return finish(composed, options.output);
}

async function finish(png: Buffer, output: "webp" | "png" = "webp"): Promise<Buffer> {
  return output === "png" ? png : compress(png);
}

/** Telegram chegarasiga sig'guncha WEBP sifatini pasaytiradi. */
async function compress(png: Buffer): Promise<Buffer> {
  for (const quality of [92, 82, 70, 58, 45]) {
    const webp = await sharp(png).webp({ quality, effort: 5 }).toBuffer();
    if (webp.length <= MAX_BYTES) return webp;
  }
  // Bunday bo'lishi deyarli mumkin emas (512x512 rasm), lekin baribir.
  return sharp(png).webp({ quality: 35 }).toBuffer();
}

/**
 * Telegram'ga yuboriladigan statik stiker: 512x512 WEBP, chegaradan
 * kichik. PNG kelsa ham, WEBP kelsa ham shu yerdan o'tadi.
 */
export async function ensureStickerWebp(input: Buffer): Promise<Buffer> {
  const square = await sharp(input)
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return compress(square);
}

/** Ikki rasmni ustma-ust qo'yish (masalan yozuvli ramka). */
export async function overlay(bottom: Buffer, top: Buffer): Promise<Buffer> {
  const composed = await sharp(bottom)
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .composite([{ input: await sharp(top).resize(SIZE, SIZE, { fit: "contain" }).png().toBuffer() }])
    .png()
    .toBuffer();
  return compress(composed);
}
