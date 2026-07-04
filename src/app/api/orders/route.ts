import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { createOrder } from "@/lib/orders/create-order";

const orderSchema = z.object({
  customerName: z.string().min(2).max(120),
  phoneNumber: z.string().min(7).max(20),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
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
});

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Buyurtma ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const order = await createOrder({
      customerName: parsed.data.customerName,
      phoneNumber: parsed.data.phoneNumber,
      items: parsed.data.items,
      location: parsed.data.location ?? null,
      deliveryAddress: parsed.data.deliveryAddress ?? null,
      paymentMethod: parsed.data.paymentMethod,
      userId: currentUser?.uid ?? null,
    });

    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch (error) {
    // Aniq sabab server loglarida ko'rinadi - mijozga umumiy xabar qaytariladi.
    console.error("Buyurtmani saqlashda xato:", error);
    return NextResponse.json({ error: "Buyurtmani saqlashda xatolik yuz berdi." }, { status: 500 });
  }
}
