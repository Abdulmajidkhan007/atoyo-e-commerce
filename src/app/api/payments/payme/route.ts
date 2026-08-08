import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Order } from "@/types/order";
import { reportError } from "@/lib/ops/report-error";

export const runtime = "nodejs";

/**
 * PAYME MERCHANT API (JSON-RPC 2.0 webhook).
 *
 * Payme serveri to'lov jarayonida shu endpoint'ga murojaat qiladi:
 * CheckPerformTransaction → CreateTransaction → PerformTransaction
 * (bekor qilinsa CancelTransaction). Autentifikatsiya - Basic header:
 * base64("Paycom:" + PAYME_KEY).
 *
 * Tranzaksiya holati buyurtma hujjatining o'zida saqlanadi:
 *   paymeTransactionId, paymeState (1/2/-1/-2), paymeCreateTime,
 *   paymePerformTime, paymeCancelTime. Perform bo'lganda
 *   paymentStatus: "paid" ga o'tadi.
 *
 * Summalar TIYINda (so'm × 100).
 */

// Payme xato kodlari
const ERR_AUTH = -32504;
const ERR_METHOD = -32601;
const ERR_AMOUNT = -31001;
const ERR_ORDER_NOT_FOUND = -31050;
const ERR_TX_NOT_FOUND = -31003;
const ERR_CANT_PERFORM = -31008;

interface PaymeRequest {
  id: number | string;
  method: string;
  params: {
    id?: string;
    time?: number;
    amount?: number;
    account?: { order_id?: string };
    reason?: number;
  };
}

function rpcResult(id: PaymeRequest["id"], result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: PaymeRequest["id"], code: number, message: string) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    error: { code, message: { uz: message, ru: message, en: message } },
  });
}

function isAuthorized(request: Request): boolean {
  const key = process.env.PAYME_KEY;
  if (!key) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Basic ${Buffer.from(`Paycom:${key}`).toString("base64")}`;
  return header === expected;
}

async function getOrder(orderId: string | undefined): Promise<(Order & { paymeState?: number; paymeTransactionId?: string | null; paymeCreateTime?: number; paymePerformTime?: number; paymeCancelTime?: number }) | null> {
  if (!orderId) return null;
  const snap = await getAdminDb().collection("orders").doc(orderId).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as Order) : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PaymeRequest | null;
  const id = body?.id ?? 0;

  if (!isAuthorized(request)) {
    return rpcError(id, ERR_AUTH, "Avtorizatsiya xatosi.");
  }
  if (!body?.method) {
    return rpcError(id, ERR_METHOD, "Metod ko'rsatilmagan.");
  }

  const params = body.params ?? {};
  const db = getAdminDb();

  try {
    switch (body.method) {
      case "CheckPerformTransaction": {
        const order = await getOrder(params.account?.order_id);
        if (!order) return rpcError(id, ERR_ORDER_NOT_FOUND, "Buyurtma topilmadi.");
        if (order.paymentStatus === "paid") return rpcError(id, ERR_CANT_PERFORM, "Buyurtma allaqachon to'langan.");
        if (order.status === "cancelled") return rpcError(id, ERR_CANT_PERFORM, "Buyurtma bekor qilingan.");
        if (params.amount !== Math.round(order.totalAmount * 100)) {
          return rpcError(id, ERR_AMOUNT, "Summa noto'g'ri.");
        }
        return rpcResult(id, { allow: true });
      }

      case "CreateTransaction": {
        const order = await getOrder(params.account?.order_id);
        if (!order) return rpcError(id, ERR_ORDER_NOT_FOUND, "Buyurtma topilmadi.");
        if (params.amount !== Math.round(order.totalAmount * 100)) {
          return rpcError(id, ERR_AMOUNT, "Summa noto'g'ri.");
        }

        // Bir buyurtmaga faqat bitta faol tranzaksiya.
        if (order.paymeTransactionId && order.paymeTransactionId !== params.id) {
          return rpcError(id, ERR_CANT_PERFORM, "Buyurtmada boshqa tranzaksiya bor.");
        }

        if (order.paymeTransactionId === params.id) {
          return rpcResult(id, {
            create_time: order.paymeCreateTime ?? Date.now(),
            transaction: order.id,
            state: order.paymeState ?? 1,
          });
        }

        const createTime = Date.now();
        await db.collection("orders").doc(order.id).update({
          paymeTransactionId: params.id,
          paymeState: 1,
          paymeCreateTime: createTime,
          updatedAt: createTime,
        });
        return rpcResult(id, { create_time: createTime, transaction: order.id, state: 1 });
      }

      case "PerformTransaction": {
        const snap = await db.collection("orders").where("paymeTransactionId", "==", params.id).limit(1).get();
        if (snap.empty) return rpcError(id, ERR_TX_NOT_FOUND, "Tranzaksiya topilmadi.");
        const doc = snap.docs[0]!;
        const order = doc.data() as Order & { paymeState?: number; paymePerformTime?: number };

        if (order.paymeState === 2) {
          return rpcResult(id, { transaction: doc.id, perform_time: order.paymePerformTime ?? Date.now(), state: 2 });
        }

        const performTime = Date.now();
        await doc.ref.update({
          paymeState: 2,
          paymePerformTime: performTime,
          paymentStatus: "paid",
          updatedAt: performTime,
        });
        return rpcResult(id, { transaction: doc.id, perform_time: performTime, state: 2 });
      }

      case "CancelTransaction": {
        const snap = await db.collection("orders").where("paymeTransactionId", "==", params.id).limit(1).get();
        if (snap.empty) return rpcError(id, ERR_TX_NOT_FOUND, "Tranzaksiya topilmadi.");
        const doc = snap.docs[0]!;
        const order = doc.data() as Order & { paymeState?: number; paymeCancelTime?: number };

        const wasPerformed = order.paymeState === 2;
        const cancelTime = order.paymeCancelTime ?? Date.now();
        await doc.ref.update({
          paymeState: wasPerformed ? -2 : -1,
          paymeCancelTime: cancelTime,
          paymentStatus: "failed",
          updatedAt: cancelTime,
        });
        return rpcResult(id, { transaction: doc.id, cancel_time: cancelTime, state: wasPerformed ? -2 : -1 });
      }

      case "CheckTransaction": {
        const snap = await db.collection("orders").where("paymeTransactionId", "==", params.id).limit(1).get();
        if (snap.empty) return rpcError(id, ERR_TX_NOT_FOUND, "Tranzaksiya topilmadi.");
        const doc = snap.docs[0]!;
        const order = doc.data() as Order & {
          paymeState?: number;
          paymeCreateTime?: number;
          paymePerformTime?: number;
          paymeCancelTime?: number;
        };
        return rpcResult(id, {
          create_time: order.paymeCreateTime ?? 0,
          perform_time: order.paymePerformTime ?? 0,
          cancel_time: order.paymeCancelTime ?? 0,
          transaction: doc.id,
          state: order.paymeState ?? 0,
          reason: null,
        });
      }

      default:
        return rpcError(id, ERR_METHOD, "Noma'lum metod.");
    }
  } catch (error) {
    // Pul yo'lidagi xato - xodimlar guruhiga darhol xabar ketsin.
    await reportError("Payme webhook", error, { method: body?.method, id: String(id ?? "") });
    return rpcError(id, ERR_CANT_PERFORM, "Ichki xatolik.");
  }
}
