import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";

export const runtime = "nodejs";

const schema = z.object({
  orders: z.number().int().min(0),
  contact: z.number().int().min(0),
  subscribers: z.number().int().min(0),
  actions: z.number().int().min(0),
  /** E'lon kanali: @username yoki -100... ID. Bo'sh - env'dagi qiymat ishlatiladi. */
  channelId: z.string().max(100).default(""),
  requiredChannels: z
    .array(
      z.object({
        chatId: z.string().max(100),
        title: z.string().max(120),
        url: z.string().max(300),
      })
    )
    .max(10)
    .default([]),
});

/**
 * Bot sozlamalari (topic thread ID lari, e'lon kanali, majburiy obuna
 * kanallari). Ilgari client Firestore orqali yozilardi - admin panelda
 * client auth sessiyasi tiklanmagani uchun osilib qolardi; endi server.
 */
export async function PATCH(request: Request) {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  await getAdminDb().doc("settings/telegram").set(parsed.data, { merge: true });
  return NextResponse.json({ ok: true });
}
