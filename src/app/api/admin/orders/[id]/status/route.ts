import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/firebase/session";
import { applyOrderStatusUpdate } from "@/lib/orders/update-status";

const bodySchema = z.object({
  status: z.enum(["pending", "approved", "delivering", "completed", "cancelled"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Status noto'g'ri." }, { status: 400 });
  }

  const { id } = await params;
  const updatedOrder = await applyOrderStatusUpdate(id, parsed.data.status);

  if (!updatedOrder) {
    return NextResponse.json({ error: "Buyurtma topilmadi." }, { status: 404 });
  }

  return NextResponse.json({ order: updatedOrder });
}
