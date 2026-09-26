import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { canAccessOrder } from "@/lib/orders/order-access";
import { attachReceipt, ReceiptError } from "@/lib/orders/payment-transfer";
import { MAX_RECEIPT_BYTES } from "@/lib/orders/receipt";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/ops/report-error";
import type { Order } from "@/types/order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * O'TKAZMA CHEKINI YUKLASH (mijoz).
 *
 * Kirish: havoladagi kalit (`t`, forma maydoni) yoki o'z buyurtmasi.
 * Kalit noto'g'ri bo'lsa 404 — buyurtma borligi bilinmasin.
 * Bitta buyurtmaga sutkasiga 10 ta yuklash (qayta-qayta yuklab
 * Storage'ni to'ldirish bo'lmasin). Fayl turi BAYTLARIDAN tekshiriladi.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Segment nomi `[id]` - qo'shni `/api/orders/[id]/cancel` bilan bir xil
  // bo'lishi SHART (Next.js bir darajada ikki xil nomni qabul qilmaydi).
  const { id: orderId } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) {
    return NextResponse.json({ error: "Topilmadi." }, { status: 404 });
  }

  // Juda katta so'rovni o'qishdan OLDIN rad etamiz.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_RECEIPT_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Fayl 8 MB dan oshmasin." }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const token = String(form?.get("t") ?? "");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Chek fayli tanlanmagan." }, { status: 400 });
  }

  const snap = await getAdminDb().collection("orders").doc(orderId).get();
  if (!snap.exists) return NextResponse.json({ error: "Topilmadi." }, { status: 404 });
  const order = { id: snap.id, ...snap.data() } as Order;
  if (!(await canAccessOrder(order, token, request))) {
    return NextResponse.json({ error: "Topilmadi." }, { status: 404 });
  }

  const limit = await checkRateLimit({ key: `receipt:${orderId}`, limit: 10, windowMs: 24 * 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Juda ko'p urinish. Bizga qo'ng'iroq qiling." }, { status: 429 });
  }

  try {
    const updated = await attachReceipt(orderId, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ ok: true, receiptUploadedAt: updated.receipt?.uploadedAt ?? null });
  } catch (error) {
    if (error instanceof ReceiptError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    await reportError("chek yuklash", error, { buyurtma: orderId });
    return NextResponse.json({ error: "Chekni saqlab bo'lmadi. Qayta urinib ko'ring." }, { status: 500 });
  }
}
