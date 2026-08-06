import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/firebase/session";
import { getSocialSettings, saveSocialSettings } from "@/lib/social/settings";
import { describeSocialSecrets } from "@/lib/social/secrets";
import { queueSummary } from "@/lib/social/publish";
import { youtubeRedirectUri } from "@/lib/social/youtube-oauth";
import { metaRedirectUri } from "@/lib/social/meta-oauth";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * IJTIMOIY TARMOQ SOZLAMALARI: qaysi tarmoq yoqilgan, post shabloni,
 * kunlik chegara. Kalitlarning o'zi bu yerda ko'rsatilmaydi - faqat
 * "sozlangan/sozlanmagan" holati.
 */
const schema = z.object({
  instagram: z.boolean().optional(),
  facebook: z.boolean().optional(),
  youtube: z.boolean().optional(),
  template: z.string().max(2000).optional(),
  hashtags: z.string().max(400).optional(),
  dailyLimit: z.number().int().min(0).max(50).optional(),
});

export async function GET(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const [settings, secrets, queue] = await Promise.all([
    getSocialSettings(),
    describeSocialSecrets(),
    queueSummary(),
  ]);
  return NextResponse.json({
    settings,
    secrets,
    queue,
    // Google/Meta konsoliga qo'shiladigan manzillar - SERVER qaysi
    // manzilni yuborsa, aynan o'shani ko'rsatamiz (aks holda
    // "redirect_uri_mismatch" chiqadi).
    redirectUris: { youtube: youtubeRedirectUri(), meta: metaRedirectUri() },
  });
}

export async function PUT(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const settings = await saveSocialSettings(parsed.data);
  await logAction(
    `⚙️ Ijtimoiy tarmoq sozlamasi (${admin.email ?? "admin"}): ` +
      `IG ${settings.instagram ? "yoqilgan" : "o'chiq"}, ` +
      `FB ${settings.facebook ? "yoqilgan" : "o'chiq"}, ` +
      `YouTube ${settings.youtube ? "yoqilgan" : "o'chiq"}`
  );
  return NextResponse.json({ settings });
}
