import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminUser } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";

const intakeSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().positive().max(100000),
        /** Ixtiyoriy: kirim bilan birga yangi sotuv narxi. */
        price: z.number().positive().optional(),
        /** Ixtiyoriy: mahsulot kimdan kelgani (yetkazib beruvchi). */
        supplier: z.string().max(120).optional(),
      })
    )
    .min(1)
    .max(100),
});

/**
 * MAHSULOT KIRIMI: mavjud mahsulotlarga yangi partiya keldi - zaxira
 * ko'paytiriladi (atomik increment), xohlasa narx va yetkazib beruvchi
 * ham yangilanadi. Bir so'rovda butun kirim ro'yxati qabul qilinadi.
 */
export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = intakeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const db = getAdminDb();
  const batch = db.batch();
  const now = Date.now();

  for (const item of parsed.data.items) {
    const ref = db.collection("products").doc(item.productId);
    const updates: Record<string, unknown> = {
      stock: FieldValue.increment(item.qty),
      updatedAt: now,
    };
    if (item.price !== undefined) updates.price = item.price;
    if (item.supplier !== undefined && item.supplier.trim()) updates.supplier = item.supplier.trim();
    batch.update(ref, updates);
  }

  try {
    await batch.commit();
    await logAction(`📥 Kirim (${admin.email ?? "admin"}): ${parsed.data.items.length} ta mahsulot zaxirasi yangilandi`);
    return NextResponse.json({ ok: true, updated: parsed.data.items.length });
  } catch (error) {
    console.error("Kirimni saqlashda xato:", error);
    return NextResponse.json({ error: "Kirimni saqlashda xatolik yuz berdi." }, { status: 500 });
  }
}
