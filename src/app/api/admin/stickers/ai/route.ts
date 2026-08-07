import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/firebase/session";
import { generateStickerImage } from "@/lib/stickers/ai";
import { isImageAiConfigured } from "@/lib/ai/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Rasm generatsiyasi sekin - Cloud Run standart chegarasi yetmaydi. */
export const maxDuration = 120;

/**
 * AI STIKER YASASH (faqat admin).
 *
 * Natija DARHOL to'plamga qo'shilmaydi - avval admin ko'radi.
 * Ma'qul bo'lsa "To'plamga qo'shish" tugmasi uni
 * `/api/admin/stickers/create` ga yuboradi.
 */
const schema = z.object({
  mode: z.enum(["prompt", "template", "photo", "style"]),
  idea: z.string().max(300).default(""),
  imageUrl: z.string().url().max(500).optional(),
  imageBase64: z.string().max(12_000_000).optional(),
  referenceFileId: z.string().max(200).optional(),
  outline: z.number().int().min(0).max(40).optional(),
  removeBackground: z.boolean().optional(),
});

export async function GET(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  return NextResponse.json({ enabled: isImageAiConfigured() });
}

export async function POST(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "So'rov noto'g'ri." }, { status: 400 });

  try {
    // PNG qaytaramiz: brauzer ham ko'rsatadi, shablon ichiga ham
    // qo'yiladi (satori WEBP ni o'qimaydi). Telegram'ga yuborishdan
    // oldin `create` yo'li uni WEBP ga siqadi.
    const png = await generateStickerImage({ ...parsed.data, output: "png" });
    return NextResponse.json({
      image: `data:image/png;base64,${png.toString("base64")}`,
      bytes: png.length,
    });
  } catch (error) {
    console.error("AI stiker xatosi:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stiker yasalmadi." },
      { status: 500 }
    );
  }
}
