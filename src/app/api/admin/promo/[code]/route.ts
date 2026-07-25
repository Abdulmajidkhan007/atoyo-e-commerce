import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { normalizePromoCode } from "@/lib/orders/promo";

export const runtime = "nodejs";

const patchSchema = z.object({
  type: z.enum(["percent", "fixed"]).optional(),
  value: z.number().int().min(1).optional(),
  minOrderAmount: z.number().int().min(0).optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
});

/** Promokodni tahrirlash (kodning o'zi o'zgarmaydi - ID). */
export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });
  if (parsed.data.type === "percent" && (parsed.data.value ?? 0) > 100) {
    return NextResponse.json({ error: "Foiz 100 dan oshmasligi kerak." }, { status: 400 });
  }

  const { code } = await params;
  const ref = getAdminDb().doc(`promoCodes/${normalizePromoCode(code)}`);
  if (!(await ref.get()).exists) {
    return NextResponse.json({ error: "Promokod topilmadi." }, { status: 404 });
  }

  await ref.update({ ...parsed.data, updatedAt: Date.now() });
  return NextResponse.json({ ok: true });
}

/** Promokodni o'chirish. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const { code } = await params;
  await getAdminDb().doc(`promoCodes/${normalizePromoCode(code)}`).delete();
  return NextResponse.json({ ok: true });
}
