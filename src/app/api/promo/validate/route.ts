import { NextResponse } from "next/server";
import { z } from "zod";
import { PROMO_ERROR_MESSAGES, deliveryFeeFor, validatePromo } from "@/lib/orders/promo";
import { getDeliverySettings, getPromoCode } from "@/lib/orders/pricing";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().min(1).max(40),
  subtotal: z.number().int().min(0),
});

/**
 * Checkout'da promokodni oldindan tekshirish (faqat ko'rsatish uchun).
 * Yakuniy hisob baribir buyurtma yaratishda serverda qayta chiqariladi.
 */
export async function POST(request: Request) {
  const { allowed } = await checkRateLimit({
    key: `promo:${getClientIp(request)}`,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Juda ko'p urinish. Keyinroq qayta urining." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const promo = await getPromoCode(parsed.data.code);
  const result = validatePromo(promo, parsed.data.subtotal);
  if (!result.ok) {
    return NextResponse.json({ error: PROMO_ERROR_MESSAGES[result.error] }, { status: 400 });
  }

  const settings = await getDeliverySettings();
  const payable = parsed.data.subtotal - result.discount;

  return NextResponse.json({
    ok: true,
    code: promo!.code,
    discount: result.discount,
    deliveryFee: deliveryFeeFor(settings, payable),
    total: payable + deliveryFeeFor(settings, payable),
  });
}
