import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { isOwner } from "@/lib/permissions";
import { describeEmailSecrets, saveEmailSecrets } from "@/lib/email/secrets";
import { sendGenericEmail } from "@/lib/email/mailer";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SMTP SOZLAMASI (faqat loyiha egasiga).
 *
 * Kalitlar `secrets/email` hujjatiga yoziladi - deploy qilish shart
 * emas. Parol javobda hech qachon qaytarilmaydi.
 */
const schema = z.object({
  host: z.string().max(120).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  user: z.string().max(200).optional(),
  pass: z.string().max(200).optional(),
  from: z.string().max(200).optional(),
});

export async function GET() {
  const user = await getCurrentAppUser();
  if (!isOwner(user)) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  return NextResponse.json(await describeEmailSecrets());
}

export async function PUT(request: Request) {
  const user = await getCurrentAppUser();
  if (!isOwner(user)) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  await saveEmailSecrets(parsed.data);
  await logAction(`📧 SMTP sozlamasi yangilandi (${user?.email ?? "egasi"})`);
  return NextResponse.json(await describeEmailSecrets());
}

/** Sinov xati - o'ziga yuboriladi. */
export async function POST(request: Request) {
  const user = await getCurrentAppUser();
  if (!isOwner(user)) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { to?: string };
  const to = (body.to ?? user?.email ?? "").trim();
  if (!to) return NextResponse.json({ error: "Qabul qiluvchi manzil yo'q." }, { status: 400 });

  const ok = await sendGenericEmail(
    to,
    "Atoyo — sinov xati",
    "<p>Bu sinov xati. Demak SMTP to'g'ri sozlangan ✅</p>"
  );
  return NextResponse.json(
    ok ? { ok: true, to } : { ok: false, error: "Xat ketmadi - host/port/parolni tekshiring." }
  );
}
