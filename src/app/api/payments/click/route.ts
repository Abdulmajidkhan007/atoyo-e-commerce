import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Order } from "@/types/order";

export const runtime = "nodejs";

/**
 * CLICK SHOP API webhook (prepare + complete).
 *
 * Click serveri to'lovda ikki bosqichda murojaat qiladi:
 *   action=0 (prepare)  - buyurtmani tekshirish
 *   action=1 (complete) - to'lovni yakunlash
 * Har so'rov MD5 imzo bilan keladi:
 *   md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id +
 *       [merchant_prepare_id (faqat complete'da)] + amount + action + sign_time)
 *
 * Muvaffaqiyatli complete'da buyurtma paymentStatus: "paid" bo'ladi.
 */

const ERR_SIGN = -1;
const ERR_AMOUNT = -2;
const ERR_ALREADY_PAID = -4;
const ERR_ORDER_NOT_FOUND = -5;
const ERR_CANCELLED = -9;

function md5(value: string): string {
  return createHash("md5").update(value).digest("hex");
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: ERR_SIGN, error_note: "Bad request" });
  }

  const clickTransId = String(form.get("click_trans_id") ?? "");
  const serviceId = String(form.get("service_id") ?? "");
  const merchantTransId = String(form.get("merchant_trans_id") ?? "");
  const merchantPrepareId = String(form.get("merchant_prepare_id") ?? "");
  const amount = String(form.get("amount") ?? "");
  const action = String(form.get("action") ?? "");
  const signTime = String(form.get("sign_time") ?? "");
  const signString = String(form.get("sign_string") ?? "");
  const clickError = String(form.get("error") ?? "0");

  const secret = process.env.CLICK_SECRET_KEY ?? "";
  const expectedSign = md5(
    clickTransId +
      serviceId +
      secret +
      merchantTransId +
      (action === "1" ? merchantPrepareId : "") +
      amount +
      action +
      signTime
  );

  const base = { click_trans_id: clickTransId, merchant_trans_id: merchantTransId };

  if (!secret || signString.toLowerCase() !== expectedSign.toLowerCase()) {
    return NextResponse.json({ ...base, error: ERR_SIGN, error_note: "Imzo noto'g'ri" });
  }

  const snap = await getAdminDb().collection("orders").doc(merchantTransId).get();
  if (!snap.exists) {
    return NextResponse.json({ ...base, error: ERR_ORDER_NOT_FOUND, error_note: "Buyurtma topilmadi" });
  }
  const order = { id: snap.id, ...snap.data() } as Order;

  if (Math.round(Number(amount)) !== Math.round(order.totalAmount)) {
    return NextResponse.json({ ...base, error: ERR_AMOUNT, error_note: "Summa noto'g'ri" });
  }
  if (order.status === "cancelled") {
    return NextResponse.json({ ...base, error: ERR_CANCELLED, error_note: "Buyurtma bekor qilingan" });
  }

  // action=0: PREPARE
  if (action === "0") {
    if (order.paymentStatus === "paid") {
      return NextResponse.json({ ...base, error: ERR_ALREADY_PAID, error_note: "Allaqachon to'langan" });
    }
    await snap.ref.update({ clickTransId, updatedAt: Date.now() });
    return NextResponse.json({
      ...base,
      merchant_prepare_id: order.id,
      error: 0,
      error_note: "Success",
    });
  }

  // action=1: COMPLETE
  if (action === "1") {
    // Click o'zi xato yuborgan bo'lsa - to'lov amalga oshmagan.
    if (clickError !== "0") {
      await snap.ref.update({ paymentStatus: "failed", updatedAt: Date.now() });
      return NextResponse.json({ ...base, merchant_confirm_id: order.id, error: 0, error_note: "Failed marked" });
    }
    if (order.paymentStatus !== "paid") {
      await snap.ref.update({ paymentStatus: "paid", clickTransId, updatedAt: Date.now() });
    }
    return NextResponse.json({ ...base, merchant_confirm_id: order.id, error: 0, error_note: "Success" });
  }

  return NextResponse.json({ ...base, error: ERR_SIGN, error_note: "Noma'lum action" });
}
