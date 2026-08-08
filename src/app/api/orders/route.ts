import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { createOrder, OrderValidationError } from "@/lib/orders/create-order";
import { normalizePhone, isValidName } from "@/lib/validation";
import { reportError } from "@/lib/ops/report-error";

const orderSchema = z.object({
  customerName: z
    .string()
    .min(2)
    .max(120)
    .refine(isValidName, { message: "Ism noto'g'ri" }),
  phoneNumber: z
    .string()
    .transform((v) => normalizePhone(v))
    .refine((v): v is string => v !== null, { message: "Telefon raqam noto'g'ri" }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().max(200).nullable().optional(),
        name: z.string().min(1),
        price: z.number().nonnegative(),
        quantity: z.number().int().positive(),
        thumbnailUrl: z.string(),
      })
    )
    .min(1),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().optional(),
    })
    .nullable()
    .optional(),
  deliveryAddress: z.string().max(500).nullable().optional(),
  paymentMethod: z.enum(["cash", "online"]).default("cash"),
  promoCode: z.string().max(40).nullable().optional(),
  /** Yetkazish hududi (sozlamalardagi ro'yxatdan). */
  deliveryZoneId: z.string().max(60).nullable().optional(),
});

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Buyurtma ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  try {
    // Buyurtma faqat tizimga kirgan foydalanuvchidan qabul qilinadi -
    // admin kimdan buyurtma kelganini aniq bilishi kerak.
    const currentUser = await getAppUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Buyurtma berish uchun tizimga kiring." }, { status: 401 });
    }
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
    });

    return NextResponse.json({ orderId: order.id }, { status: 201 });
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
