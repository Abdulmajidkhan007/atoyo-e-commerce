import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/firebase/session";
import { reviewTransferPayment } from "@/lib/orders/payment-transfer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ paid: z.boolean() });

/** O'tkazma to'lovini tasdiqlash / rad etish (admin panel). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("orders", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "paid: true/false kerak." }, { status: 400 });

  const { id } = await params;
  const order = await reviewTransferPayment(id, parsed.data.paid, admin.email ?? "admin");
  if (!order) return NextResponse.json({ error: "Buyurtma topilmadi." }, { status: 404 });
  return NextResponse.json({ ok: true, paymentStatus: order.paymentStatus });
}
