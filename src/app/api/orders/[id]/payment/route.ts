import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { canAccessOrder } from "@/lib/orders/order-access";
import { NO_STORE_HEADERS } from "@/lib/http/cache";
import type { Order } from "@/types/order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * BUYURTMANING TO'LOV HOLATI (ilovadagi `OrderPaymentScreen` uchun).
 *
 * Saytda bu ma'lumot `/buyurtma/<id>?t=` sahifasida serverda chiziladi;
 * ilova esa HTML o'qimaydi, mehmon esa Firestore'dan buyurtma o'qiy
 * olmaydi — shuning uchun shu kichik javob. Summa SERVERDAN keladi
 * (ilova narx hisoblamaydi, CLAUDE.md 1-band).
 *
 * Kirish chek yuklash bilan bir xil: `?t=<kalit>` yoki kirgan mijozning
 * O'Z buyurtmasi (`canAccessOrder`), aks holda 404 — buyurtma borligi
 * ham bilinmasin. Javobda faqat to'lovga kerakli maydonlar: telefon,
 * manzil, chek fayli yo'li (`receipt.path`) va tannarx YO'Q. Keshlanmaydi.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) {
    return NextResponse.json({ error: "Topilmadi." }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const token = new URL(request.url).searchParams.get("t") ?? "";
  const snap = await getAdminDb().collection("orders").doc(orderId).get();
  if (!snap.exists) return NextResponse.json({ error: "Topilmadi." }, { status: 404, headers: NO_STORE_HEADERS });
  const order = { id: snap.id, ...snap.data() } as Order;
  if (!(await canAccessOrder(order, token, request))) {
    return NextResponse.json({ error: "Topilmadi." }, { status: 404, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json(
    {
      order: {
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        hasReceipt: Boolean(order.receipt),
        receiptCount: order.receiptCount ?? 0,
      },
    },
    { headers: NO_STORE_HEADERS }
  );
}
