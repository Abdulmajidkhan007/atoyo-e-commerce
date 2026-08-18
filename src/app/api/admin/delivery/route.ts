import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { validationMessage } from "@/lib/http/validation";
import { requirePermission } from "@/lib/firebase/session";
import { getDeliverySettings } from "@/lib/orders/pricing";

export const runtime = "nodejs";

const schema = z.object({
  fee: z.number().int().min(0),
  freeFrom: z.number().int().min(0),
  enabled: z.boolean(),
  /**
   * Hududlar (tuman bo'yicha narx). Bo'sh bo'lsa hamma joyga standart
   * narx qo'llanadi.
   */
  zones: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        name: z.string().min(1).max(80),
        fee: z.number().int().min(0),
        freeFrom: z.number().int().min(0).optional(),
      })
    )
    .max(50)
    .optional(),

  /**
   * MIJOZGA KO'RINADIGAN VA'DA (matn). Narx hisobiga ta'sir qilmaydi -
   * sayt/ilova/bot/kanalda shu matn chiqadi (`lib/delivery/text.ts`).
   */
  city: z.string().max(60).optional(),
  freeRadiusKm: z.number().int().min(0).max(500).optional(),
  note: z.string().max(300).optional(),
  installEnabled: z.boolean().optional(),
  installNote: z.string().max(300).optional(),
});

/** Yetkazib berish narxi sozlamalari (admin). */
export async function GET() {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  return NextResponse.json({ delivery: await getDeliverySettings() });
}

export async function PATCH(request: Request) {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  }

  await getAdminDb().doc("settings/delivery").set(parsed.data, { merge: true });
  return NextResponse.json({ ok: true });
}
