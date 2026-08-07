import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/firebase/session";
import {
  getStickerSettings,
  listPackStickers,
  saveStickerSettings,
  setSlotSticker,
} from "@/lib/telegram/stickers";
import { STICKER_SLOTS, type StickerInfo, type StickerSlot } from "@/types/sticker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * STIKER SOZLAMALARI: qaysi slotga qaysi stiker biriktirilgan va
 * tanlash uchun to'plamlar ro'yxati.
 */
const schema = z.object({
  packName: z.string().max(80).optional(),
  ownerUserId: z.number().int().positive().nullable().optional(),
  extraPacks: z.array(z.string().max(80)).max(10).optional(),
  /** Bitta slotga stiker biriktirish (bo'sh qator - olib tashlash). */
  slot: z.enum(STICKER_SLOTS as [StickerSlot, ...StickerSlot[]]).optional(),
  fileId: z.string().max(200).optional(),
});

export async function GET(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const settings = await getStickerSettings();

  // To'plamlarni o'qish - biri ochilmasa qolganlari baribir chiqadi.
  const names = [settings.packName, ...settings.extraPacks].filter(Boolean);
  const packs: { name: string; stickers: StickerInfo[]; error?: string }[] = [];
  for (const name of names) {
    try {
      packs.push({ name, stickers: await listPackStickers(name) });
    } catch (error) {
      packs.push({
        name,
        stickers: [],
        error: error instanceof Error ? error.message : "To'plam ochilmadi.",
      });
    }
  }

  return NextResponse.json({ settings, packs });
}

export async function PUT(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "So'rov noto'g'ri." }, { status: 400 });

  const { slot, fileId, ...rest } = parsed.data;
  if (slot) {
    const settings = await setSlotSticker(slot, fileId ?? "");
    return NextResponse.json({ settings });
  }

  const settings = await saveStickerSettings(rest);
  return NextResponse.json({ settings });
}
