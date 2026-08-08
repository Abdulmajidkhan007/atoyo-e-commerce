import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { announceBlogPost } from "@/lib/telegram/channel";
import type { BlogPost } from "@/types/content";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

const postSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).default(""),
  content: z.string().max(20000).default(""),
  coverImageUrl: z.string().url().or(z.literal("")).default(""),
  isPublished: z.boolean().default(true),
});


/**
 * Barcha maqolalar (chop etilgani ham, chernovigi ham) - mobil ilovaning
 * admin bo'limi uchun. Saytda bu ro'yxat server komponentida o'qiladi.
 */
export async function GET(request: Request) {
  const admin = await requirePermission("blog", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const snap = await getAdminDb().collection("blogPosts").limit(100).get();
  const posts = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => ((b as { createdAt?: number }).createdAt ?? 0) - ((a as { createdAt?: number }).createdAt ?? 0));

  return NextResponse.json({ posts });
}

/** Yangi blog post yaratish (faqat admin). */
export async function POST(request: Request) {
  const admin = await requirePermission("blog", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const d = parsed.data;
  const now = Date.now();
  const ref = getAdminDb().collection("blogPosts").doc();
  const post: BlogPost = {
    id: ref.id,
    slug: `${slugify(d.title, { fallback: "post" })}-${ref.id.slice(0, 6)}`,
    title: d.title.trim(),
    excerpt: d.excerpt.trim(),
    content: d.content.trim(),
    coverImageUrl: d.coverImageUrl,
    isPublished: d.isPublished,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(post);
  await announceBlogPost(post, "new");
  return NextResponse.json({ post }, { status: 201 });
}
