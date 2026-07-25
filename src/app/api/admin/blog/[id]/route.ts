import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import type { BlogPost } from "@/types/content";

export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().max(20000).optional(),
  coverImageUrl: z.string().url().or(z.literal("")).optional(),
  isPublished: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("blog");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

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
  if (d.isPublished !== undefined) updates.isPublished = d.isPublished;

  await ref.update(updates);
  return NextResponse.json({ post: { ...(snap.data() as BlogPost), ...updates, id } });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("blog");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const { id } = await params;
  await getAdminDb().collection("blogPosts").doc(id).delete();
  return NextResponse.json({ ok: true });
}
