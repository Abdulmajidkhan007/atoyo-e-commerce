import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { isCardSaveConfigured, payWithSavedCard } from "@/lib/payments/cards";
import type { Order } from "@/types/order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SAQLANGAN KARTA BILAN TO'LASH.
 *
 * Buyurtma summasi va egasi SERVERDA tekshiriladi — mijoz yuborgan
 * summaga ishonilmaydi. To'lov `receipts.pay` orqali ketadi; buyurtma
 * "paid" holatiga Payme'ning o'z webhook'i (`/api/payments/payme`,
 * PerformTransaction) orqali o'tadi — ya'ni haqiqiy tasdiqdan keyin.
 */

const schema = z.object({
  orderId: z.string().min(1).max(64),
  cardId: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  if (!isCardSaveConfigured()) {
    return NextResponse.json({ error: "Karta bilan to'lash hozircha yoqilmagan." }, { status: 503 });
  }

  const user = await getAppUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Avval hisobingizga kiring." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "So'rov noto'g'ri." }, { status: 400 });

  const db = getAdminDb();
  const orderRef = db.collection("orders").doc(parsed.data.orderId);
  const [orderSnap, cardSnap] = await Promise.all([
    orderRef.get(),
    db.collection("users").doc(user.uid).collection("cards").doc(parsed.data.cardId).get(),
  ]);

  if (!orderSnap.exists) return NextResponse.json({ error: "Buyurtma topilmadi." }, { status: 404 });
  if (!cardSnap.exists) return NextResponse.json({ error: "Karta topilmadi." }, { status: 404 });

  const order = { id: orderSnap.id, ...orderSnap.data() } as Order;
  const card = cardSnap.data() as { token: string; verified: boolean };

  if (order.userId !== user.uid) {
    return NextResponse.json({ error: "Bu buyurtma sizniki emas." }, { status: 403 });
  }
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ error: "Buyurtma allaqachon to'langan." }, { status: 400 });
  }
  if (!card.verified) {
    return NextResponse.json({ error: "Karta tasdiqlanmagan — SMS kodni kiriting." }, { status: 400 });
  }

  try {
    const { receiptId } = await payWithSavedCard({
      token: card.token,
      orderId: order.id,
      amountSom: order.totalAmount,
    });

    await orderRef.update({
      paymeReceiptId: receiptId,
      paymentStatus: order.paymentStatus === "not_required" ? "pending" : order.paymentStatus,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ ok: true, receiptId });
  } catch (error) {
    console.error("Karta bilan to'lashda xato:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "To'lov amalga oshmadi." },
      { status: 502 }
    );
  }
}
