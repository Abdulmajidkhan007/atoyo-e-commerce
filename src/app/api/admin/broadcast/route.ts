import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/firebase/session";
import { sendBroadcast } from "@/lib/broadcast";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";
// Ko'p qabul qiluvchiga yuborish vaqt oladi - standart 10s yetmasligi mumkin.
export const maxDuration = 60;

const broadcastSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(4000),
  viaTelegram: z.boolean().default(true),
  viaEmail: z.boolean().default(true),
  /** Ochiq kanalga ham post qilinsinmi. */
  viaChannel: z.boolean().default(false),
});

/** Admin paneldan barcha foydalanuvchilarga e'lon yuborish. */
export async function POST(request: Request) {
  const admin = await requirePermission("broadcast");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = broadcastSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const result = await sendBroadcast(parsed.data);
  await logAction(
    `📢 E'lon yuborildi (${admin.email ?? "admin"}): "${parsed.data.title}" — Telegram: ${result.telegramSent}, Email: ${result.emailSent}` +
      (result.channelPosted ? ", kanalga post qilindi" : "")
  );

  return NextResponse.json({ ok: true, ...result });
}
