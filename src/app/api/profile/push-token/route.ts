import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { removePushToken, savePushToken } from "@/lib/notifications/push";

export const runtime = "nodejs";

const schema = z.object({ token: z.string().min(10).max(4096) });

/**
 * Mobil ilova qurilma tokenini shu yerga yuboradi (har ishga tushganda
 * va token yangilanganda). Autentifikatsiya - `Authorization: Bearer
 * <Firebase ID token>` yoki sayt sessiya cookie'si.
 */
export async function POST(request: Request) {
  const user = await getAppUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Token noto'g'ri." }, { status: 400 });

  await savePushToken(user.uid, parsed.data.token);
  return NextResponse.json({ ok: true });
}

/** Chiqishda yoki bildirishnomalar o'chirilganda. */
export async function DELETE(request: Request) {
  const user = await getAppUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Token noto'g'ri." }, { status: 400 });

  await removePushToken(user.uid, parsed.data.token);
  return NextResponse.json({ ok: true });
}
