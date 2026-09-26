import { NextResponse } from "next/server";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { createOrder, OrderValidationError } from "@/lib/orders/create-order";
import { orderErrorMessage, orderSchema } from "@/lib/orders/order-schema";
import { newOrderAccessToken } from "@/lib/orders/access-token";
import { reportError } from "@/lib/ops/report-error";

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: orderErrorMessage(parsed.error) }, { status: 400 });
  }

  try {
    // Buyurtma faqat tizimga kirgan foydalanuvchidan qabul qilinadi -
    // admin kimdan buyurtma kelganini aniq bilishi kerak.
    const currentUser = await getAppUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Buyurtma berish uchun tizimga kiring." }, { status: 401 });
    }
    // Buyurtma sahifasi (o'tkazma kartasi, chek yuklash) shu kalit bilan
    // ochiladi - `/buyurtma/<id>?t=<kalit>`.
    const access = newOrderAccessToken();
    const order = await createOrder({
      customerName: parsed.data.customerName,
      phoneNumber: parsed.data.phoneNumber,
      items: parsed.data.items,
      location: parsed.data.location ?? null,
      deliveryAddress: parsed.data.deliveryAddress ?? null,
      paymentMethod: parsed.data.paymentMethod,
      promoCode: parsed.data.promoCode ?? null,
      deliveryZoneId: parsed.data.deliveryZoneId ?? null,
      userId: currentUser.uid,
      customerEmail: currentUser.email ?? null,
      // Narx rolga qarab: optom mijozga optom, qolganlarga dona.
      role: currentUser.role,
      accessTokenHash: access.hash,
    });

    return NextResponse.json({ orderId: order.id, accessToken: access.token }, { status: 201 });
  } catch (error) {
    // Zaxira yetmasligi / mahsulot yo'qligi - mijozga aniq sabab aytiladi.
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    // Boshqa xatolar - mijozga umumiy xabar, xodimlar guruhiga esa
    // aniq sabab (buyurtma yo'qolib qolmasin).
    await reportError("Buyurtmani saqlash", error);
    return NextResponse.json({ error: "Buyurtmani saqlashda xatolik yuz berdi." }, { status: 500 });
  }
}
