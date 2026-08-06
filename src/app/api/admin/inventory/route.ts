import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { getStockMoves, recordStockMoves } from "@/lib/inventory/stock-moves";
import { logAction } from "@/lib/telegram/action-log";
import type { StockMoveType } from "@/types/inventory";
import type { Product } from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ombor harakatlari tarixi. */
export async function GET(request: Request) {
  const admin = await requirePermission("products", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const moves = await getStockMoves({
    productId: params.get("productId") ?? undefined,
    type: (params.get("type") as StockMoveType | null) ?? undefined,
    limit: Number(params.get("limit") ?? 50),
  });
  return NextResponse.json({ moves });
}

const adjustSchema = z.object({
  productId: z.string().min(1),
  /**
   * `out`  - chiqim: singan/yo'qolgan/sovg'a (zaxira KAMAYADI);
   * `count`- sanoq: haqiqiy qoldiq kiritiladi (zaxira SHU songa tenglashadi).
   */
  type: z.enum(["out", "count"]),
  /** `out` uchun - nechta chiqdi; `count` uchun - sanoqdagi haqiqiy qoldiq. */
  qty: z.number().int().nonnegative().max(1000000),
  note: z.string().max(200).default(""),
});

/**
 * OMMAVIY SANOQ/CHIQIM: filtrlangan ro'yxat bo'yicha bir necha
 * mahsulotni bir yo'la tuzatish (bittalab qidirib o'tirmaslik uchun).
 * Har bir mahsulot uchun ombor tarixiga alohida yozuv tushadi.
 */
const bulkSchema = z.object({
  type: z.enum(["out", "count"]),
  note: z.string().max(200).default(""),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().nonnegative().max(1000000),
      })
    )
    .min(1)
    .max(200),
});

export async function PUT(request: Request) {
  const admin = await requirePermission("products", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = bulkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const { type, note, items } = parsed.data;
  const db = getAdminDb();
  const refs = items.map((item) => db.collection("products").doc(item.productId));
  const snaps = await db.getAll(...refs);

  const batch = db.batch();
  const moves: Parameters<typeof recordStockMoves>[0] = [];
  const skipped: string[] = [];
  const now = Date.now();

  snaps.forEach((snap, index) => {
    if (!snap.exists) return;
    const product = snap.data() as Product;
    const item = items[index]!;
    const before = product.stock ?? 0;

    // Chiqimda zaxiradan ko'pini olib bo'lmaydi - o'sha qator tashlanadi.
    if (type === "out" && item.qty > before) {
      skipped.push(product.name);
      return;
    }

    const after = type === "out" ? before - item.qty : item.qty;
    if (after === before) return;

    batch.update(refs[index]!, { stock: after, updatedAt: now });
    moves.push({
      productId: item.productId,
      productName: product.name,
      productCode: product.code ?? null,
      type,
      qty: after - before,
      stockBefore: before,
      stockAfter: after,
      note: note.trim() || (type === "count" ? "Inventarizatsiya" : "Chiqim"),
      adminUid: admin.uid,
      adminName: admin.displayName ?? admin.email ?? null,
    });
  });

  if (moves.length > 0) {
    await batch.commit();
    await recordStockMoves(moves);
    await logAction(
      type === "count"
        ? `🔢 Ommaviy sanoq (${admin.email ?? "admin"}): ${moves.length} ta mahsulot qoldig'i tenglashtirildi`
        : `📤 Ommaviy chiqim (${admin.email ?? "admin"}): ${moves.length} ta mahsulot`
    );
  }

  return NextResponse.json({ ok: true, updated: moves.length, skipped });
}

/**
 * QO'LDA TUZATISH: chiqim yoki inventarizatsiya (sanoq).
 *
 * Ikkalasi ham zaxirani o'zgartiradi va tarixga yozuv qoldiradi -
 * "zaxira o'zi kamayib qolibdi" degan holat bo'lmaydi.
 */
export async function POST(request: Request) {
  const admin = await requirePermission("products", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = adjustSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const { productId, type, qty, note } = parsed.data;
  const ref = getAdminDb().collection("products").doc(productId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Mahsulot topilmadi." }, { status: 404 });

  const product = snap.data() as Product;
  const before = product.stock ?? 0;

  if (type === "out" && qty > before) {
    return NextResponse.json(
      { error: `Zaxirada faqat ${before} ta bor — bundan ko'pini chiqarib bo'lmaydi.` },
      { status: 400 }
    );
  }

  const after = type === "out" ? before - qty : qty;
  const delta = after - before;

  await ref.update(
    type === "out"
      ? { stock: FieldValue.increment(-qty), updatedAt: Date.now() }
      : { stock: after, updatedAt: Date.now() }
  );

  await recordStockMoves([
    {
      productId,
      productName: product.name,
      productCode: product.code ?? null,
      type,
      qty: delta,
      stockBefore: before,
      stockAfter: after,
      note: note.trim() || (type === "count" ? "Inventarizatsiya" : "Chiqim"),
      adminUid: admin.uid,
      adminName: admin.displayName ?? admin.email ?? null,
    },
  ]);

  await logAction(
    type === "out"
      ? `📤 Chiqim (${admin.email ?? "admin"}): ${product.name} — ${qty} ta${note ? ` (${note})` : ""}`
      : `🔢 Sanoq (${admin.email ?? "admin"}): ${product.name} — ${before} → ${after}`
  );

  return NextResponse.json({ ok: true, stockBefore: before, stockAfter: after });
}
