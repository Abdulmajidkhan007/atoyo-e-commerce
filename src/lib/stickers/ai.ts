import "server-only";
import { generateImage, isImageAiConfigured, type ImageSource } from "@/lib/ai/images";
import { downloadTelegramFile } from "@/lib/telegram/bot";
import { toStickerImage } from "./image";
import type { StickerAiMode } from "./ai-modes";

/**
 * AI STIKER STUDIYASI (faqat admin).
 *
 * Gemini rasm modeli rasm chizadi, keyin `image.ts` uni haqiqiy
 * Telegram stikeriga aylantiradi: 512x512, foni shaffof, atrofida
 * oq chegara.
 *
 * To'rt xil manba bor - foydalanuvchi tanlaydi:
 *   prompt   - faqat matndan ("kulayotgan santexnik");
 *   template - do'kon uslubidagi belgi (ko'k/oltin, ramkaga tushadi);
 *   photo    - mahsulot suratidan (fon olinadi, stiker bo'ladi);
 *   style    - mavjud stikerni NAMUNA qilib, o'sha uslubda yangisi.
 *
 * MUHIM: model matn yozishda ko'p xato qiladi (ayniqsa o'zbekcha),
 * shuning uchun promptda "yozuv chizma" deb aytiladi - yozuv kerak
 * bo'lsa u saytdagi shablon orqali ustiga qo'yiladi.
 */

export type { StickerAiMode } from "./ai-modes";
/** Har bir promptga qo'shiladigan umumiy qoida. */
const STICKER_RULE = [
  "Design a single messaging sticker.",
  "Output a square image with the subject centered and fully visible, with a generous empty margin around it.",
  "Plain solid pure white background, no gradient, no shadow on the background, no frame, no border.",
  "Bold, clean, high-contrast illustration that stays readable at 100x100 pixels.",
  "Do NOT draw any text, letters, numbers, watermarks or logos.",
].join(" ");

/** Do'kon brend uslubi (ko'k + oltin). */
const BRAND_STYLE =
  "Flat vector illustration in the brand palette: deep navy blue (#0B3B54) and warm gold (#C49A6C) with white accents. " +
  "Simple geometric shapes, thick outlines, minimal detail, plumbing and heating shop theme.";

function promptFor(mode: StickerAiMode, idea: string): string {
  const wish = idea.trim().slice(0, 300);
  switch (mode) {
    case "template":
      return `${wish}. ${BRAND_STYLE} ${STICKER_RULE}`;
    case "photo":
      return (
        `Turn this product photo into a sticker illustration: ${wish || "keep the product recognizable"}. ` +
        "Keep the product's shape and colour, simplify it into a clean bold illustration. " +
        STICKER_RULE
      );
    case "style":
      return (
        `Draw a NEW sticker in exactly the same visual style as the reference image: ${wish}. ` +
        "Match its colours, line weight and overall look, but draw the new subject described above. " +
        STICKER_RULE
      );
    default:
      return `${wish}. Cheerful, friendly sticker illustration. ${STICKER_RULE}`;
  }
}

export interface StickerAiInput {
  mode: StickerAiMode;
  /** Nima chizilishi (o'zbekcha bo'lsa ham bo'ladi). */
  idea: string;
  /** `photo` rejimi: mahsulot rasmi manzili yoki yuklangan fayl. */
  imageUrl?: string;
  imageBase64?: string;
  /** `style` rejimi: namuna stikerning Telegram `file_id` si. */
  referenceFileId?: string;
  /** Oq chegara qalinligi (0 - chegarasiz). */
  outline?: number;
  /** Fonni olib tashlash (deyarli har doim kerak). */
  removeBackground?: boolean;
  /** `png` - shablon ichiga qo'yish uchun; `webp` - to'g'ridan yuklash. */
  output?: "webp" | "png";
}

async function loadSource(input: StickerAiInput): Promise<ImageSource | null> {
  if (input.imageBase64) {
    const clean = input.imageBase64.replace(/^data:([^;,]+)[^,]*,/, "");
    const mime = input.imageBase64.match(/^data:([^;,]+)/)?.[1] ?? "image/png";
    return { base64: clean, mimeType: mime };
  }

  if (input.imageUrl) {
    const response = await fetch(input.imageUrl);
    if (!response.ok) throw new Error("Namuna rasmni yuklab bo'lmadi.");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 8 * 1024 * 1024) throw new Error("Rasm juda katta (8MB gacha).");
    return {
      base64: buffer.toString("base64"),
      mimeType: (response.headers.get("content-type") ?? "image/jpeg").split(";")[0]!,
    };
  }

  if (input.referenceFileId) {
    // Mavjud stikerni Telegram'dan olib, namuna sifatida beramiz.
    const file = await downloadTelegramFile(input.referenceFileId);
    return { base64: file.buffer.toString("base64"), mimeType: file.contentType };
  }

  return null;
}

/** AI stiker yasaydi va tayyor WEBP baytlarini qaytaradi. */
export async function generateStickerImage(input: StickerAiInput): Promise<Buffer> {
  if (!isImageAiConfigured()) {
    throw new Error("GEMINI_API_KEY sozlanmagan — AI stiker yasay olmaydi.");
  }
  if (!input.idea.trim() && input.mode !== "photo") {
    throw new Error("Nima chizilishini yozing.");
  }

  const source = await loadSource(input);
  if ((input.mode === "photo" || input.mode === "style") && !source) {
    throw new Error(
      input.mode === "photo" ? "Mahsulot suratini tanlang." : "Namuna stikerni tanlang."
    );
  }

  const generated = await generateImage({
    prompt: promptFor(input.mode, input.idea),
    sources: source ? [source] : undefined,
  });

  return toStickerImage(generated.buffer, {
    removeBackground: input.removeBackground !== false,
    outline: input.outline ?? 14,
    output: input.output ?? "webp",
  });
}
