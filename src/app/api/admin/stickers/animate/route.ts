import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/firebase/session";
import { svgFromScene } from "@/lib/stickers/animate";
import { buildAnimationScene } from "@/lib/stickers/animations";
import { STICKER_ANIMATIONS, type StickerAnimation } from "@/types/sticker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ANIMATSIYALI STIKERNING JONLI KO'RINISHI.
 *
 * Telegramga yuboriladigan `.tgs` bilan AYNAN bir sahnadan
 * chiziladi (`lib/stickers/animate.ts`), faqat format boshqa:
 * bu yerda SVG + SMIL, u yerda Lottie. Shuning uchun admin nimani
 * ko'rsa, mijoz ham shuni oladi.
 *
 * Brauzerda Lottie o'quvchi kutubxona kerak emas - SVG animatsiyasi
 * `<img>` ichida ham o'z-o'zidan harakatlanadi.
 */
export async function GET(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const requested = params.get("animation") as StickerAnimation | null;
  const animation: StickerAnimation =
    requested && STICKER_ANIMATIONS.includes(requested) ? requested : "puls";

  const svg = svgFromScene(buildAnimationScene(animation, params.get("icon") ?? "star"));

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Ko'rinish sof funksiya - bir xil parametrga bir xil natija.
      "Cache-Control": "private, max-age=300",
    },
  });
}
