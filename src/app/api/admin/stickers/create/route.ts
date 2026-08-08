import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/firebase/session";
import { stickerPng } from "@/lib/stickers/render";
import { ensureStickerWebp } from "@/lib/stickers/image";
import { tgsFromScene } from "@/lib/stickers/animate";
import { buildAnimationScene } from "@/lib/stickers/animations";
import { addStickerToPack } from "@/lib/telegram/stickers";
import { logAction } from "@/lib/telegram/action-log";
import { STICKER_ANIMATIONS, type StickerAnimation } from "@/types/sticker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * YANGI STIKER YASASH VA TO'PLAMGA QO'SHISH.
 *
 * Uch xil manba bo'lishi mumkin:
 *   • `design`    - saytda yasalgan statik stiker (PNG, `next/og`);
 *   • `animation` - saytda yasalgan ANIMATSIYALI stiker (`.tgs`,
 *     ya'ni gzip qilingan Lottie - `lib/stickers/animate.ts`);
 *   • `upload`    - tayyor fayl (dizayner tayyorlagan `.tgs` yoki
 *     video `.webm`) - masalan animatsiyali video stiker, uni sayt
 *     yasay olmaydi, lekin to'plamga qo'sha oladi.
 *
 * MUHIM: Bot faqat O'ZI yaratgan to'plamga stiker qo'sha oladi.
 * @Stickers bot orqali yasalgan eski to'plam tahrirlanmaydi.
 */
const schema = z.union([
  z.object({
    kind: z.literal("design"),
    template: z.enum(["circle", "badge", "banner"]),
    text: z.string().min(1).max(70),
    subtitle: z.string().max(70).optional(),
    icon: z.string().max(30).optional(),
    /** AI chizgan rasm - ikonka o'rniga shablon ichiga qo'yiladi. */
    artDataUrl: z.string().max(3_000_000).optional(),
    color: z.string().max(20).optional(),
    withLogo: z.boolean().optional(),
    emoji: z.string().min(1).max(8),
  }),
  z.object({
    kind: z.literal("animation"),
    animation: z.enum(STICKER_ANIMATIONS as [string, ...string[]]),
    icon: z.string().max(30).optional(),
    emoji: z.string().min(1).max(8),
  }),
  z.object({
    kind: z.literal("upload"),
    /** Fayl mazmuni base64 ko'rinishida. */
    data: z.string().min(10),
    fileName: z.string().max(120),
    format: z.enum(["static", "animated", "video"]),
    emoji: z.string().min(1).max(8),
  }),
]);

/** Telegram cheklovlari (turiga qarab). */
const MAX_BYTES: Record<"static" | "animated" | "video", number> = {
  static: 512 * 1024,
  animated: 64 * 1024,
  video: 256 * 1024,
};

const CONTENT_TYPE: Record<"static" | "animated" | "video", string> = {
  static: "image/png",
  animated: "application/gzip",
  video: "video/webm",
};

/** Yuklangan faylning turi nom bo'yicha (AI stiker WEBP qaytaradi). */
function contentTypeFor(format: "static" | "animated" | "video", fileName: string): string {
  if (format === "static") return "image/webp";
  return CONTENT_TYPE[format];
}

export async function POST(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "So'rov noto'g'ri." }, { status: 400 });

  const input = parsed.data;

  try {
    let buffer: Buffer;
    let format: "static" | "animated" | "video";
    let fileName: string;

    if (input.kind === "design") {
      buffer = await ensureStickerWebp(
        await stickerPng({
          template: input.template,
          text: input.text,
          subtitle: input.subtitle,
          icon: input.icon,
          artDataUrl: input.artDataUrl,
          color: input.color,
          withLogo: input.withLogo,
        })
      );
      format = "static";
      fileName = "atoyo-sticker.webp";
    } else if (input.kind === "animation") {
      buffer = tgsFromScene(
        buildAnimationScene(input.animation as StickerAnimation, input.icon || "star")
      );
      format = "animated";
      fileName = "atoyo-sticker.tgs";
    } else {
      buffer = Buffer.from(input.data.replace(/^data:[^,]+,/, ""), "base64");
      format = input.format;
      // Statik stiker har doim 512x512 WEBP ga keltiriladi.
      if (format === "static") buffer = await ensureStickerWebp(buffer);
      fileName =
        format === "static"
          ? "atoyo-sticker.webp"
          : input.fileName || `atoyo-sticker.${format === "video" ? "webm" : "tgs"}`;
    }

    if (buffer.length > MAX_BYTES[format]) {
      return NextResponse.json(
        {
          error: `Fayl juda katta: ${Math.round(buffer.length / 1024)}KB. Telegram chegarasi — ${
            MAX_BYTES[format] / 1024
          }KB.`,
        },
        { status: 400 }
      );
    }

    const result = await addStickerToPack({
      buffer,
      contentType: contentTypeFor(format, fileName),
      fileName,
      format,
      emoji: input.emoji,
    });

    const what =
      input.kind === "design"
        ? `"${input.text}"`
        : input.kind === "animation"
          ? `animatsiya "${input.animation}"`
          : fileName;

    await logAction(
      `🎨 Yangi stiker qo'shildi (${admin.email ?? "admin"}): ${what} → t.me/addstickers/${
        result.packName
      }`
    ).catch(() => {});

    return NextResponse.json({
      ...result,
      link: `https://t.me/addstickers/${result.packName}`,
    });
  } catch (error) {
    console.error("Stiker qo'shishda xato:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stiker qo'shilmadi." },
      { status: 500 }
    );
  }
}
