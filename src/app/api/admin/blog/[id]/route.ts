import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { announceBlogPost } from "@/lib/telegram/channel";
import { enqueueBlogPost } from "@/lib/social/publish";
import { DEFAULT_BLOG_DESTINATIONS, type BlogPost } from "@/types/content";
import { validationMessage } from "@/lib/http/validation";

export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().max(20000).optional(),
  coverImageUrl: z.string().url().or(z.literal("")).optional(),
  /** Kontent videosi (mahsulot videosi emas). */
  videoUrl: z.string().url().or(z.literal("")).optional(),
  /** Qayerga yuborilsin (belgilanmasa - avvalgi xatti-harakat). */
  destinations: z
    .object({
      telegram: z.boolean(),
      youtube: z.boolean(),
      instagram: z.boolean(),
      facebook: z.boolean(),
    })
    .optional(),
  isPublished: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("blog");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  const { id } = await params;
  const ref = getAdminDb().collection("blogPosts").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Post topilmadi." }, { status: 404 });

  const d = parsed.data;
  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (d.title !== undefined) updates.title = d.title.trim();
  if (d.excerpt !== undefined) updates.excerpt = d.excerpt.trim();
  if (d.content !== undefined) updates.content = d.content.trim();
  if (d.coverImageUrl !== undefined) updates.coverImageUrl = d.coverImageUrl;
  if (d.videoUrl !== undefined) updates.videoUrl = d.videoUrl;
  if (d.isPublished !== undefined) updates.isPublished = d.isPublished;
  if (d.destinations !== undefined) updates.destinations = d.destinations;

  await ref.update(updates);
  const post = { ...(snap.data() as BlogPost), ...updates, id } as BlogPost;
  // Eski maqolalarda `destinations` yo'q - ular avvalgidek
  // (Telegram + video bo'lsa YouTube) qabul qilinadi.
  const destinations = post.destinations ?? DEFAULT_BLOG_DESTINATIONS;
  // Kanalda post bo'lsa - o'shanisi yangilanadi, yangisi tashlanmaydi.
  // Telegram belgisi olib tashlangan bo'lsa yangi post ham ketmaydi
  // (mavjud post joyida qoladi - uni bot o'chirmaydi).
  const sent = destinations.telegram ? await announceBlogPost(post, "updated") : null;
  if (sent && !post.channelMessageId) {
    post.channelChatId = sent.chatId;
    post.channelMessageId = sent.messageId;
    await ref.update({ channelChatId: sent.chatId, channelMessageId: sent.messageId });
  }
  // Video/rasm keyin qo'shilgan yoki yangi tarmoq belgilangan bo'lsa
  // ham navbatga tushadi (har tarmoqqa bir marta).
  const queued = await enqueueBlogPost(post).catch((error) => {
    console.error("Maqolani ijtimoiy tarmoq navbatiga qo'shishda xato:", error);
    return 0;
  });
  return NextResponse.json({ post, socialQueued: queued });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("blog");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const { id } = await params;
  await getAdminDb().collection("blogPosts").doc(id).delete();
  return NextResponse.json({ ok: true });
}
