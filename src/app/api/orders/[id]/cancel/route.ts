import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { applyOrderStatusUpdate } from "@/lib/orders/update-status";
import { logAction } from "@/lib/telegram/action-log";
import type { Order } from "@/types/order";

export const runtime = "nodejs";

/** Mijoz o'z buyurtmasini shu holatlarda bekor qila oladi. */
const CANCELLABLE = ["pending", "approved"];

/**
 * MIJOZ BUYURTMANI O'ZI BEKOR QILADI. Faqat o'z buyurtmasini va faqat
 * yetkazish boshlanmagan bo'lsa. Zaxira qaytarish, Telegram xabarini
 * yangilash va xabarnomalar - hammasi applyOrderStatusUpdate ichida
 * (admin bekor qilgani bilan bir xil yo'l).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Tizimga kiring." }, { status: 401 });

  const { id } = await params;
  const snap = await getAdminDb().collection("orders").doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Buyurtma topilmadi." }, { status: 404 });

  const order = snap.data() as Order;
  if (order.userId !== user.uid) {
    return NextResponse.json({ error: "Bu sizning buyurtmangiz emas." }, { status: 403 });
  }
  if (!CANCELLABLE.includes(order.status)) {
    return NextResponse.json(
      { error: "Bu buyurtmani endi bekor qilib bo'lmaydi. Operator bilan bog'laning." },
      { status: 409 }
    );
  }

  const updated = await applyOrderStatusUpdate(id, "cancelled");
  await logAction(`❌ Mijoz buyurtmani bekor qildi: #${id.slice(0, 8)} (${user.email ?? user.uid})`);

  return NextResponse.json({ ok: true, order: updated });
}
