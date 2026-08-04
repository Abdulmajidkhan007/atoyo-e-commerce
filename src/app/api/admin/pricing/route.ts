import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { clearPricingCache, getPricingSettings } from "@/lib/products/pricing-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  /** Dona narxga qo'shiladigan ustama (foiz). */
  retailMarkupPercent: z.number().min(0).max(500),
  /** Buyurtmaning eng kam summasi (so'm). */
  minOrderAmount: z.number().min(0).max(100_000_000),
});

export async function GET(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  return NextResponse.json({ pricing: await getPricingSettings() });
}

export async function PUT(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Qiymatlar noto'g'ri." }, { status: 400 });

  await getAdminDb()
    .collection("settings")
    .doc("pricing")
    .set({ ...parsed.data, updatedAt: Date.now() }, { merge: true });

  // Kesh bekor qilinadi - yangi foiz darhol ishlaydi.
  clearPricingCache();

  return NextResponse.json({ pricing: parsed.data });
}
