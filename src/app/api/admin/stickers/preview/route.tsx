import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/firebase/session";
import { stickerImage } from "@/lib/stickers/render";
import type { StickerTemplate } from "@/types/sticker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * YASALAYOTGAN STIKERNING KO'RINISHI (512x512 PNG).
 *
 * Admin panel shu manzilni `<img>` da ko'rsatadi - Telegram'ga
 * yuborishdan oldin natija ko'rinib turadi. Rasm `next/og` bilan
 * chiziladi, tashqi xizmat kerak emas.
 */
export async function GET(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const params = new URL(request.url).searchParams;
  return stickerImage({
    template: (params.get("template") as StickerTemplate) || "circle",
    text: params.get("text") ?? "ATOYO",
    subtitle: params.get("subtitle") ?? "",
    icon: params.get("icon") ?? "none",
    color: params.get("color") ?? undefined,
    withLogo: params.get("logo") !== "0",
  });
}
