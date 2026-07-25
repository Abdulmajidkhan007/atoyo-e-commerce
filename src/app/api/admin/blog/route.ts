import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import type { BlogPost } from "@/types/content";

export const runtime = "nodejs";

const postSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).default(""),
  content: z.string().max(20000).default(""),
  coverImageUrl: z.string().url().or(z.literal("")).default(""),
  isPublished: z.boolean().default(true),
});

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-") || "post"
  );
}

/** Yangi blog post yaratish (faqat admin). */
export async function POST(request: Request) {
  const admin = await requirePermission("blog");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const d = parsed.data;
  const now = Date.now();
  const ref = getAdminDb().collection("blogPosts").doc();
  const post: BlogPost = {
    id: ref.id,
    slug: `${slugify(d.title)}-${ref.id.slice(0, 6)}`,
    title: d.title.trim(),
    excerpt: d.excerpt.trim(),
    content: d.content.trim(),
    coverImageUrl: d.coverImageUrl,
    isPublished: d.isPublished,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(post);
  return NextResponse.json({ post }, { status: 201 });
}
