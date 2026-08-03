import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { uploadProductImageAdmin } from "@/lib/firebase/admin-storage";
import { isAiConfigured } from "@/lib/ai/config";
import {
  analyzeProductImage,
  generateProductImages,
  isImageAiConfigured,
  IMAGE_STYLES,
  type ImageStyle,
} from "@/lib/ai/images";
import type { Product } from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bir martada nechta rasm - xarajat va vaqtni cheklaydi. */
const MAX_PER_RUN = 5;
const MAX_IMAGES = 10;

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("analyze"), sourceUrl: z.string().url().optional() }),
  z.object({
    action: z.literal("generate"),
    sourceUrl: z.string().url().optional(),
    styles: z.array(z.enum(Object.keys(IMAGE_STYLES) as [ImageStyle, ...ImageStyle[]])).min(1).max(MAX_PER_RUN),
    extraPrompt: z.string().max(300).optional(),
    /** Rasmlarni mahsulotga darhol qo'shish (false - faqat ko'rish). */
    attach: z.boolean().optional(),
  }),
]);

/** Yoqilganini bilish uchun (admin paneldagi tugmalar shunga qarab chiziladi). */
export async function GET(request: Request) {
  const admin = await requirePermission("products", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  return NextResponse.json({
    analyze: isAiConfigured(),
    generate: isImageAiConfigured(),
    styles: Object.entries(IMAGE_STYLES).map(([key, value]) => ({ key, label: value.label })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("products", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "So'rov noto'g'ri." }, { status: 400 });

  const { id } = await params;
  const ref = getAdminDb().collection("products").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return NextResponse.json({ error: "Mahsulot topilmadi." }, { status: 404 });

  const product = { id: snapshot.id, ...snapshot.data() } as Product;
  const sourceUrl = parsed.data.sourceUrl ?? product.images?.[0] ?? product.thumbnailUrl;
  if (!sourceUrl) {
    return NextResponse.json({ error: "Avval mahsulotga kamida bitta rasm yuklang." }, { status: 400 });
  }

  try {
    // ---- Rasmga qarab kartochkani to'ldirish (taklif; avtomatik saqlanmaydi) ----
    if (parsed.data.action === "analyze") {
      if (!isAiConfigured()) {
        return NextResponse.json({ error: "ANTHROPIC_API_KEY sozlanmagan." }, { status: 503 });
      }
      const suggestion = await analyzeProductImage(sourceUrl, product.name);
      return NextResponse.json({ suggestion });
    }

    // ---- Bitta rasmdan bir nechta savdo rasmi ----
    if (!isImageAiConfigured()) {
      return NextResponse.json({ error: "GEMINI_API_KEY sozlanmagan." }, { status: 503 });
    }

    const { images, failed } = await generateProductImages({
      sourceUrl,
      styles: parsed.data.styles,
      extraPrompt: parsed.data.extraPrompt,
    });

    if (images.length === 0) {
      return NextResponse.json({ error: "Rasm generatsiya qilinmadi. Keyinroq urinib ko'ring." }, { status: 502 });
    }

    const urls: string[] = [];
    for (const [index, image] of images.entries()) {
      urls.push(
        await uploadProductImageAdmin(id, {
          buffer: image.buffer,
          contentType: image.contentType,
          originalName: `ai-${Date.now()}-${index}.png`,
        })
      );
    }

    // Admin xohlasa - rasmlar darhol mahsulotga qo'shiladi (10 tagacha).
    if (parsed.data.attach !== false) {
      const merged = [...(product.images ?? []), ...urls].slice(0, MAX_IMAGES);
      await ref.update({
        images: merged,
        thumbnailUrl: product.thumbnailUrl || merged[0] || "",
        updatedAt: Date.now(),
      });
    }

    return NextResponse.json({
      urls,
      attached: parsed.data.attach !== false,
      failed: failed.map((style) => IMAGE_STYLES[style].label),
    });
  } catch (error) {
    console.error("AI rasm route xatosi:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Xatolik yuz berdi." },
      { status: 502 }
    );
  }
}
