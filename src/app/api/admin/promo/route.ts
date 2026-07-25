import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { normalizePromoCode } from "@/lib/orders/promo";
import type { PromoCode } from "@/types/promo";

export const runtime = "nodejs";

const promoSchema = z.object({
  code: z.string().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/, "Faqat harf, raqam, - va _"),
  type: z.enum(["percent", "fixed"]),
  value: z.number().int().min(1),
  minOrderAmount: z.number().int().min(0).default(0),
  maxUses: z.number().int().min(1).nullable().default(null),
  expiresAt: z.number().int().nullable().default(null),
  isActive: z.boolean().default(true),
});

/** Promokodlar ro'yxati (admin). */
export async function GET() {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const snap = await getAdminDb().collection("promoCodes").limit(200).get();
  const promos = snap.docs
    .map((d) => ({ ...d.data(), code: d.id }) as PromoCode)
    .sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ promos });
}

/** Yangi promokod yaratish. Kod hujjat ID'si bo'lgani uchun takrorlanmaydi. */
export async function POST(request: Request) {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = promoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri." }, { status: 400 });
  }

  const d = parsed.data;
  if (d.type === "percent" && d.value > 100) {
    return NextResponse.json({ error: "Foiz 100 dan oshmasligi kerak." }, { status: 400 });
  }

  const code = normalizePromoCode(d.code);
  const ref = getAdminDb().doc(`promoCodes/${code}`);
  if ((await ref.get()).exists) {
    return NextResponse.json({ error: "Bunday promokod allaqachon mavjud." }, { status: 409 });
  }

  const now = Date.now();
  const promo: PromoCode = {
    code,
    type: d.type,
    value: d.value,
    minOrderAmount: d.minOrderAmount,
    maxUses: d.maxUses,
    usedCount: 0,
    expiresAt: d.expiresAt,
    isActive: d.isActive,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(promo);
  return NextResponse.json({ promo }, { status: 201 });
}
