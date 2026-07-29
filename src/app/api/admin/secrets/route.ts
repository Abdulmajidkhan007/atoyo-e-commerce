import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireOwner } from "@/lib/firebase/session";
import { consumeChallenge } from "@/lib/security/challenge";
import { clearTelegramSecretsCache, describeTelegramSecrets } from "@/lib/telegram/secrets";
import { setTelegramWebhook } from "@/lib/telegram/bot";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";

/**
 * MAXFIY KALITLAR (bot tokeni, xodimlar guruhi ID si, webhook siri).
 *
 * Faqat loyiha EGASI (owner) ko'ra va o'zgartira oladi va har bir
 * o'zgartirish oldidan jumboq javobi talab qilinadi (server tomonda
 * tekshiriladi - UI'ni chetlab o'tib bo'lmaydi). Qiymatlar clientga
 * hech qachon to'liq qaytmaydi, faqat niqoblangan ko'rinishda.
 */

const patchSchema = z.object({
  challengeId: z.string().min(8).max(64),
  challengeAnswer: z.number().int(),
  /** Bo'sh qoldirilgan maydon o'zgarmaydi; "-" yozilsa env qiymatiga qaytadi. */
  botToken: z.string().max(200).default(""),
  chatId: z.string().max(60).default(""),
  webhookSecret: z.string().max(200).default(""),
  /** Yangi sir bilan webhook'ni Telegram'da qayta ro'yxatdan o'tkazish. */
  resetWebhook: z.boolean().default(false),
});

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  return NextResponse.json({ secrets: await describeTelegramSecrets() });
}

export async function PATCH(request: Request) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const passed = await consumeChallenge({
    id: parsed.data.challengeId,
    answer: parsed.data.challengeAnswer,
    uid: owner.uid,
  });
  if (!passed) {
    return NextResponse.json(
      { error: "Jumboq javobi noto'g'ri yoki eskirgan. Qaytadan urinib ko'ring." },
      { status: 403 }
    );
  }

  // "-" = panel qiymatini olib tashlash (Netlify env'idagi qiymat ishlaydi).
  const updates: Record<string, string> = {};
  const changed: string[] = [];
  for (const key of ["botToken", "chatId", "webhookSecret"] as const) {
    const value = parsed.data[key].trim();
    if (!value) continue;
    updates[key] = value === "-" ? "" : value;
    changed.push(key);
  }

  if (changed.length > 0) {
    await getAdminDb().doc("secrets/telegram").set(updates, { merge: true });
    clearTelegramSecretsCache();
  }

  let webhookNote: string | null = null;
  if (parsed.data.resetWebhook) {
    try {
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.netlify.app").replace(
        /\/$/,
        ""
      );
      const { getTelegramSecrets } = await import("@/lib/telegram/secrets");
      const { webhookSecret } = await getTelegramSecrets();
      if (!webhookSecret) throw new Error("Webhook siri bo'sh.");
      await setTelegramWebhook(`${siteUrl}/api/telegram-webhook`, webhookSecret);
      webhookNote = "Webhook qayta o'rnatildi.";
    } catch (error) {
      console.error("Webhook o'rnatishda xato:", error);
      return NextResponse.json(
        {
          ok: true,
          changed,
          error: "Kalitlar saqlandi, lekin webhook o'rnatilmadi. Tokenni tekshiring.",
        },
        { status: 200 }
      );
    }
  }

  if (changed.length > 0 || webhookNote) {
    await logAction(
      `🔐 Maxfiy kalitlar yangilandi (${owner.email ?? "owner"}): ${changed.join(", ") || "webhook"}`
    );
  }

  return NextResponse.json({ ok: true, changed, webhookNote });
}
