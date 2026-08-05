import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { activateWholesale } from "@/lib/wholesale/clients";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { ACCESS_KEY_PATTERN, normalizeAccessKey } from "@/types/wholesale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  phone: z.string().min(7).max(20),
  accessKey: z.string().min(6).max(40),
});

/**
 * OPTOM KIRISHNI FAOLLASHTIRISH.
 *
 * Mijoz avval oddiy hisob ochadi (Google/Telegram/email), keyin shu
 * yerda telefon + kalitni kiritadi. Kalit terib topilmasligi uchun
 * bir IP dan soatiga 10 ta urinish.
 */
export async function POST(request: Request) {
  const { allowed } = await checkRateLimit({
    key: `wholesale:${getClientIp(request)}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Juda ko'p urinish. Bir soatdan keyin urinib ko'ring." }, { status: 429 });
  }

  const user = await getAppUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Avval hisobingizga kiring." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const accessKey = normalizeAccessKey(parsed.data.accessKey);
  if (!ACCESS_KEY_PATTERN.test(accessKey)) {
    return NextResponse.json({ error: "Kalit ko'rinishi noto'g'ri (ATY-XXXX-XXXX)." }, { status: 400 });
  }

  const result = await activateWholesale({ phone: parsed.data.phone, accessKey, uid: user.uid });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    ok: true,
    shopName: result.client.shopName,
    number: result.client.number,
  });
}
