import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/firebase/session";
import { setTelegramWebhook } from "@/lib/telegram/bot";
import { getTelegramSecrets } from "@/lib/telegram/secrets";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";

/**
 * WEBHOOK'NI QAYTA O'RNATISH.
 *
 * Sayt domeni o'zgarganda (masalan boshqa hostingga ko'chganda) Telegram
 * hali eski manzilga xabar yuborib turadi - bot "jim" bo'lib qoladi.
 * Bu route joriy domen bo'yicha `setWebhook` ni qaytadan chaqiradi.
 *
 * Manzil so'rovning o'zidan olinadi (ya'ni qaysi domendan bosilgan
 * bo'lsa - o'sha), `NEXT_PUBLIC_SITE_URL` esa zaxira sifatida.
 */
export async function POST(request: Request) {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const { webhookSecret } = await getTelegramSecrets();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook siri (TELEGRAM_WEBHOOK_SECRET) sozlanmagan." },
      { status: 400 }
    );
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
  const webhookUrl = `${origin.replace(/\/$/, "")}/api/telegram-webhook`;

  try {
    await setTelegramWebhook(webhookUrl, webhookSecret);
    await logAction(`🔗 Telegram webhook yangilandi (${admin.email ?? "admin"}): ${webhookUrl}`);
    return NextResponse.json({ ok: true, url: webhookUrl });
  } catch (error) {
    console.error("Webhook o'rnatishda xato:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook o'rnatilmadi." },
      { status: 502 }
    );
  }
}
