import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { consumeChallenge } from "@/lib/security/challenge";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";

const schema = z.object({
  orders: z.number().int().min(0),
  contact: z.number().int().min(0),
  subscribers: z.number().int().min(0),
  actions: z.number().int().min(0),
  /** "Kirim" topic'i - rasm + izoh tashlansa mahsulot yaratiladi. */
  intake: z.number().int().min(0).default(0),
  /** Jumboq (server tomonda tekshiriladi - UI'ni chetlab o'tib bo'lmaydi). */
  challengeId: z.string().min(8).max(64),
  challengeAnswer: z.number().int(),
  /** E'lon kanali: @username yoki -100... ID. Bo'sh - env'dagi qiymat ishlatiladi. */
  channelId: z.string().max(100).default(""),
  /**
   * KANAL TEZLIGI: bitta oynada ko'pi bilan shuncha YANGI post.
   * Oshgani navbatga tushadi va oyna bo'shashi bilan chiqadi.
   * 0 - chegarasiz (hamma post darhol ketadi).
   */
  channelMaxPerWindow: z.number().int().min(0).max(60).default(5),
  /** Oyna uzunligi (daqiqa). */
  channelWindowMinutes: z.number().int().min(1).max(1440).default(10),
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

  // Topic/kanal ID lari bot ishlashini butunlay to'xtatib qo'yishi
  // mumkin - shuning uchun saqlashdan oldin jumboq javobi tekshiriladi.
  const passed = await consumeChallenge({
    id: parsed.data.challengeId,
    answer: parsed.data.challengeAnswer,
    uid: admin.uid,
  });
  if (!passed) {
    return NextResponse.json(
      { error: "Jumboq javobi noto'g'ri yoki eskirgan. Qaytadan urinib ko'ring." },
      { status: 403 }
    );
  }

  const { challengeId: _id, challengeAnswer: _answer, ...settings } = parsed.data;
  await getAdminDb().doc("settings/telegram").set(settings, { merge: true });
  await logAction(`⚙️ Bot sozlamalari yangilandi (${admin.email ?? "admin"})`);
  return NextResponse.json({ ok: true });
}
