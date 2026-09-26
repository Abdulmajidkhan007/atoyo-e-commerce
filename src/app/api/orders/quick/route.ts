import { NextResponse } from "next/server";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { createOrder, OrderValidationError } from "@/lib/orders/create-order";
import { orderErrorMessage, quickOrderSchema } from "@/lib/orders/order-schema";
import { newOrderAccessToken } from "@/lib/orders/access-token";
import { checkRateLimit, getClientIp, ipLimitKey, peekRateLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/ops/report-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;

/** Bitta IP (yoki IPv6 /64) dan soatiga. CGNAT: ko'p mijoz bitta IPv4 da. */
const IP_LIMIT = 20;
/** Bitta telefon raqamga sutkasiga MUVAFFAQIYATLI buyurtma. */
const PHONE_LIMIT = 5;
/** Butun sayt bo'yicha soatiga mehmon buyurtmasi — oshsa guruhga ogohlantirish. */
const GLOBAL_LIMIT = 30;

/**
 * 1 KLIKDA SOTIB OLISH — tizimga kirmasdan buyurtma.
 *
 * evde.uz'da faqat ism + telefon olinadi va operator qo'ng'iroq qiladi.
 * Bizda (egasining qarori) TO'LIQ ma'lumot olinadi: ism, telefon,
 * MANZIL va to'lov usuli (naqd yoki kartaga o'tkazma + chek) — operator
 * mijozdan hech narsani qayta so'ramaydi.
 *
 * Bu OCHIQ yozuv yo'li (tekshiruvchi topgan D1/D2 dan keyin):
 *   • sxema: BITTA mahsulot, ≤ 99 dona (zaxirani bir so'rovda nolga
 *     tushirib bo'lmasin);
 *   • IP (IPv6 — /64 prefiks) bo'yicha soatiga 20 ta so'rov — har
 *     so'rov sanaladi; IP aniqlanmasa bu qadam o'tkaziladi, lekin
 *     umumiy chegara baribir ishlaydi;
 *   • telefon (sutkasiga 5) va umumiy (soatiga 30) chegaralar faqat
 *     MUVAFFAQIYATLI buyurtmani sanaydi — begona odam birovning raqami
 *     bilan xato so'rovlar yuborib, uni bloklab qo'ya olmasin;
 *   • umumiy chegara to'lsa — xodimlar guruhiga ogohlantirish (hujum
 *     bo'lishi mumkin);
 *   • `website` — bot tuzog'i: to'ldirilsa buyurtma SAQLANMAYDI, javob
 *     esa "qabul qilindi" (bot farqni sezmasin, avtoto'ldirish tufayli
 *     tushib qolgan odam ham xato ko'rmasin);
 *   • narx client'dan olinmaydi — `createOrder` qayta hisoblaydi;
 *     mehmonda rol yo'q → DONA narx.
 * Mijoz tizimga kirgan bo'lsa uid va roli biriktiriladi.
 */
export async function POST(request: Request) {
  const parsed = quickOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: orderErrorMessage(parsed.error) }, { status: 400 });
  }
  const data = parsed.data;

  if (data.website && data.website.trim()) {
    console.warn("1 klikda: bot tuzog'iga tushdi (buyurtma saqlanmadi).");
    return NextResponse.json({ received: true }, { status: 201 });
  }

  const ip = getClientIp(request);
  if (ip !== "unknown") {
    const byIp = await checkRateLimit({ key: `quick-order:ip:${ipLimitKey(ip)}`, limit: IP_LIMIT, windowMs: HOUR });
    if (!byIp.allowed) return tooMany();
  }

  const phoneKey = `quick-order:phone:${data.phoneNumber}`;
  const globalKey = "quick-order:global";
  const [byPhone, global] = await Promise.all([
    peekRateLimit({ key: phoneKey, limit: PHONE_LIMIT, windowMs: 24 * HOUR }),
    peekRateLimit({ key: globalKey, limit: GLOBAL_LIMIT, windowMs: HOUR }),
  ]);
  if (!global.allowed) {
    await reportError(
      "1 klikda buyurtma",
      new Error(`Soatlik umumiy chegara (${GLOBAL_LIMIT} ta) to'ldi — hujum bo'lishi mumkin, buyurtmalarni tekshiring`)
    );
    return tooMany();
  }
  if (!byPhone.allowed) return tooMany();

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
    // Faqat MUVAFFAQIYATLI buyurtma sanaladi (yuqoridagi izoh).
    await Promise.all([
      checkRateLimit({ key: phoneKey, limit: PHONE_LIMIT, windowMs: 24 * HOUR }),
      checkRateLimit({ key: globalKey, limit: GLOBAL_LIMIT, windowMs: HOUR }),
    ]);
    return NextResponse.json({ orderId: order.id, accessToken: access.token }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    await reportError("1 klikda buyurtma", error);
    return NextResponse.json({ error: "Buyurtmani saqlashda xatolik yuz berdi." }, { status: 500 });
  }
}

function tooMany() {
  return NextResponse.json(
    { error: "Juda ko'p buyurtma yuborildi. Birozdan keyin urinib ko'ring yoki bizga qo'ng'iroq qiling." },
    { status: 429 }
  );
}
