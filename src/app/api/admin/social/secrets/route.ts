import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { isOwner } from "@/lib/permissions";
import { describeSocialSecrets, saveSocialSecrets } from "@/lib/social/secrets";
import { checkMetaCredentials } from "@/lib/social/meta";
import { checkYoutubeCredentials } from "@/lib/social/youtube";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * IJTIMOIY TARMOQ KALITLARI - faqat loyiha egasiga. Kalitlar
 * `secrets/social` hujjatiga yoziladi (clientga o'qilmaydi) va hech
 * qachon qaytarilmaydi; javobda faqat "sozlangan/sozlanmagan".
 */
const schema = z.object({
  metaAppId: z.string().max(60).optional(),
  metaAppSecret: z.string().max(120).optional(),
  pageAccessToken: z.string().max(500).optional(),
  pageId: z.string().max(60).optional(),
  igUserId: z.string().max(60).optional(),
  youtubeClientId: z.string().max(200).optional(),
  youtubeClientSecret: z.string().max(200).optional(),
  youtubeRefreshToken: z.string().max(500).optional(),
});

export async function PUT(request: Request) {
  const user = await getCurrentAppUser();
  if (!isOwner(user)) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  await saveSocialSecrets(parsed.data);
  await logAction(`🔑 Ijtimoiy tarmoq kalitlari yangilandi (${user?.email ?? "egasi"})`);
  return NextResponse.json({ secrets: await describeSocialSecrets() });
}

/** Kalitlarni tekshirish: sahifa/akkaunt/kanal nomi o'qiladimi. */
export async function POST() {
  const user = await getCurrentAppUser();
  if (!isOwner(user)) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const result: { page?: string; instagram?: string; youtube?: string; errors: string[] } = {
    errors: [],
  };

  try {
    const meta = await checkMetaCredentials();
    result.page = meta.page;
    result.instagram = meta.instagram;
  } catch (error) {
    result.errors.push(`Meta: ${error instanceof Error ? error.message : "xato"}`);
  }

  try {
    result.youtube = (await checkYoutubeCredentials()) ?? undefined;
  } catch (error) {
    result.errors.push(`YouTube: ${error instanceof Error ? error.message : "xato"}`);
  }

  return NextResponse.json(result);
}
