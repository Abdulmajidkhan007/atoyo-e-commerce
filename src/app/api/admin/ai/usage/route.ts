import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/firebase/session";
import { getImageUsage, setImageLimit } from "@/lib/ai/usage";
import { NO_STORE_HEADERS } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AI RASM SARFI: shu oyda nechta rasm chizilgan va oylik chegara.
 *
 * Har bir rasm Google hisobidan pul yechadi, shuning uchun admin
 * sarfni ko'rib turishi va chegarani o'zi belgilashi kerak.
 */

const schema = z.object({
  /** 0 - cheksiz. */
  monthlyImageLimit: z.number().int().min(0).max(100_000),
});

export async function GET(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  return NextResponse.json({ usage: await getImageUsage() }, { headers: NO_STORE_HEADERS });
}

export async function PUT(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Qiymat noto'g'ri." }, { status: 400 });

  await setImageLimit(parsed.data.monthlyImageLimit);
  return NextResponse.json({ usage: await getImageUsage() }, { headers: NO_STORE_HEADERS });
}
