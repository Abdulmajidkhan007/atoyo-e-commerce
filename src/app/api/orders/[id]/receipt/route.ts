import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { canAccessOrder } from "@/lib/orders/order-access";
import { attachReceipt, ReceiptError } from "@/lib/orders/payment-transfer";
import { MAX_RECEIPT_BYTES } from "@/lib/orders/receipt";
import { checkRateLimit, getClientIp, ipLimitKey } from "@/lib/rate-limit";
import { reportError } from "@/lib/ops/report-error";
import type { Order } from "@/types/order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Forma chegaralari uchun ortiqcha joy (boundary, maydon nomlari). */
const FORM_OVERHEAD = 64 * 1024;

/**
 * O'TKAZMA CHEKINI YUKLASH (mijoz).
 *
 * TARTIB MUHIM (tekshiruvchi topgan D3): so'rov TANASI eng oxirida
 * o'qiladi. Avval — arzon tekshiruvlar:
 *   1. `Content-Length` bo'lishi va ≤ 8 MB bo'lishi SHART (411/413).
 *      Ilgari u bo'lmasa (chunked) `formData()` 32 MB gacha xotiraga
 *      o'qib olardi — buyurtma yoki kalit tekshirilmasdan. Instansiya
 *      1 GB xotira va 40 ta parallel so'rov bilan ishlaydi — bir necha
 *      shunday so'rov uni yiqitardi.
 *   2. IP bo'yicha limit.
 *   3. Kalit (`?t=`) va buyurtma — noto'g'ri bo'lsa 404 (buyurtma
 *      borligi ham bilinmasin).
 *   4. Shundan keyingina fayl o'qiladi.
 * Bitta buyurtmaga UMRBOD ko'pi bilan 5 ta chek (`attachReceipt`) —
 * eski cheklar ataylab o'chirilmaydi, shuning uchun sutkalik limit
 * cheksiz to'planishga yo'l qo'yardi.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Segment nomi `[id]` - qo'shni `/api/orders/[id]/cancel` bilan bir xil
  // bo'lishi SHART (Next.js bir darajada ikki xil nomni qabul qilmaydi).
  const { id: orderId } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) {
    return NextResponse.json({ error: "Topilmadi." }, { status: 404 });
  }

  const lengthHeader = request.headers.get("content-length");
  if (!lengthHeader) {
    return NextResponse.json({ error: "Fayl hajmi noma'lum." }, { status: 411 });
  }
  const declared = Number(lengthHeader);
  if (!Number.isFinite(declared) || declared <= 0 || declared > MAX_RECEIPT_BYTES + FORM_OVERHEAD) {
    return NextResponse.json({ error: "Fayl 8 MB dan oshmasin." }, { status: 413 });
  }

  const ip = getClientIp(request);
  if (ip !== "unknown") {
    const byIp = await checkRateLimit({ key: `receipt:ip:${ipLimitKey(ip)}`, limit: 20, windowMs: 60 * 60 * 1000 });
    if (!byIp.allowed) {
      return NextResponse.json({ error: "Juda ko'p urinish. Bizga qo'ng'iroq qiling." }, { status: 429 });
    }
  }

  const token = new URL(request.url).searchParams.get("t") ?? "";
  const snap = await getAdminDb().collection("orders").doc(orderId).get();
  if (!snap.exists) return NextResponse.json({ error: "Topilmadi." }, { status: 404 });
  const order = { id: snap.id, ...snap.data() } as Order;
  if (!(await canAccessOrder(order, token, request))) {
    return NextResponse.json({ error: "Topilmadi." }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Chek fayli tanlanmagan." }, { status: 400 });
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
