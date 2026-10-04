import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/firebase/session";
import { validationMessage } from "@/lib/http/validation";
import { setReviewFeatured } from "@/lib/reviews/testimonials";

export const runtime = "nodejs";

const schema = z.object({ featured: z.boolean() });

/** Sharhni bosh sahifadagi "Mijozlar fikri" ga qo'shish / olib tashlash. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }
  const { id } = await params;
  if (!id || id.includes("/")) return NextResponse.json({ error: "Sharh topilmadi." }, { status: 404 });

  const ok = await setReviewFeatured(id, parsed.data.featured);
  if (!ok) return NextResponse.json({ error: "Sharh topilmadi." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
