import { NextResponse } from "next/server";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { createOrder, OrderValidationError } from "@/lib/orders/create-order";
import { orderErrorMessage, quickOrderSchema } from "@/lib/orders/order-schema";
import { newOrderAccessToken } from "@/lib/orders/access-token";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { reportError } from "@/lib/ops/report-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;

/**
 * 1 KLIKDA SOTIB OLISH — tizimga kirmasdan buyurtma.
 *
 * evde.uz'da faqat ism + telefon olinadi va operator qo'ng'iroq qiladi.
 * Bizda (egasining qarori) TO'LIQ ma'lumot olinadi: ism, telefon,
 * MANZIL va to'lov usuli (naqd yoki kartaga o'tkazma + chek) — operator
 * mijozdan hech narsani qayta so'ramaydi.
 *
 * Bu OCHIQ yozuv yo'li, shuning uchun:
 *   • IP bo'yicha soatiga 5 ta, telefon bo'yicha sutkasiga 5 ta;
 *     IP aniqlanmasa (`unknown`) IP cheklovi QO'LLANMAYDI — aks holda
 *     hamma mijoz bitta "IP"ga tushib, bir-birini bloklardi;
 *   • `website` maydoni — bot tuzog'i: to'ldirilgan bo'lsa buyurtma
 *     jimgina "qabul qilingan"dek javob oladi, lekin saqlanmaydi
 *     (bot farqni sezmasin);
 *   • narx client'dan olinmaydi — `createOrder` bazadan qayta hisoblaydi;
 *     mehmonda rol yo'q → DONA narx.
 * Mijoz tizimga kirgan bo'lsa uid va roli biriktiriladi (optom mijoz
 * 1 klikda ham o'z narxini oladi).
 */
export async function POST(request: Request) {
  const parsed = quickOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: orderErrorMessage(parsed.error) }, { status: 400 });
  }
  const data = parsed.data;

  if (data.website && data.website.trim()) {
    return NextResponse.json({ orderId: "ok", accessToken: "" }, { status: 201 });
  }

  const ip = getClientIp(request);
  const limits = await Promise.all([
    ip === "unknown"
      ? Promise.resolve({ allowed: true })
      : checkRateLimit({ key: `quick-order:ip:${ip}`, limit: 5, windowMs: HOUR }),
    checkRateLimit({ key: `quick-order:phone:${data.phoneNumber}`, limit: 5, windowMs: 24 * HOUR }),
  ]);
  if (limits.some((limit) => !limit.allowed)) {
    return NextResponse.json(
      { error: "Juda ko'p buyurtma yuborildi. Birozdan keyin urinib ko'ring yoki bizga qo'ng'iroq qiling." },
      { status: 429 }
    );
  }

  try {
    const currentUser = await getAppUserFromRequest(request).catch(() => null);
    const access = newOrderAccessToken();
    const order = await createOrder({
      customerName: data.customerName,
      phoneNumber: data.phoneNumber,
      items: data.items,
      location: data.location ?? null,
      deliveryAddress: data.deliveryAddress,
      paymentMethod: data.paymentMethod,
      promoCode: data.promoCode ?? null,
      deliveryZoneId: data.deliveryZoneId ?? null,
      userId: currentUser?.uid ?? null,
      customerEmail: currentUser?.email ?? null,
      role: currentUser?.role,
      guest: !currentUser,
      accessTokenHash: access.hash,
    });
    return NextResponse.json({ orderId: order.id, accessToken: access.token }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    await reportError("1 klikda buyurtma", error);
    return NextResponse.json({ error: "Buyurtmani saqlashda xatolik yuz berdi." }, { status: 500 });
  }
}
