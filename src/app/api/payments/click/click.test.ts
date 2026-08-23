import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * CLICK WEBHOOK.
 *
 * `docs/AUDIT.md` 2.6:
 *  - `action=1` da Click xato yuborsa faqat `paymentStatus: "failed"`
 *    yozilardi, `order.status` "pending" bo'lib qolar, zaxira
 *    qaytmasdi. Endi `applyOrderStatusUpdate(orderId, "cancelled")`
 *    chaqiriladi.
 *  - Ichki xato `{error: -1}` (imzo xatosi) o'rniga endi HTTP 500
 *    qaytaradi - Click buni "vaqtinchalik xato" deb qayta uradi.
 */

interface StoredOrder {
  totalAmount: number;
  status: string;
  paymentStatus: string;
  [key: string]: unknown;
}

let store = new Map<string, StoredOrder>();
const statusUpdateCalls: { orderId: string; status: string }[] = [];
let dbShouldThrow = false;

function docHandle(id: string) {
  const ref = {
    update: async (patch: Record<string, unknown>) => {
      store.set(id, { ...(store.get(id) as StoredOrder), ...patch } as StoredOrder);
    },
  };
  return {
    id,
    ref,
    get: async () => ({ exists: store.has(id), id, data: () => store.get(id), ref }),
  };
}

const fakeDb = {
  collection: (name: string) => {
    if (dbShouldThrow) throw new Error("Firestore vaqtincha ishlamayapti");
    if (name !== "orders") throw new Error(`kutilmagan kolleksiya: ${name}`);
    return { doc: (id: string) => docHandle(id) };
  },
};

vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: () => fakeDb }));
vi.mock("@/lib/ops/report-error", () => ({ reportError: async () => {} }));
vi.mock("@/lib/orders/update-status", () => ({
  applyOrderStatusUpdate: async (orderId: string, status: string) => {
    statusUpdateCalls.push({ orderId, status });
    const order = store.get(orderId);
    if (order) store.set(orderId, { ...order, status });
    return null;
  },
}));

process.env.CLICK_SECRET_KEY = "test-click-secret";
const SECRET = "test-click-secret";

const { POST } = await import("./route");

function md5(value: string): string {
  return createHash("md5").update(value).digest("hex");
}

function clickRequest(fields: {
  clickTransId?: string;
  serviceId?: string;
  merchantTransId: string;
  merchantPrepareId?: string;
  amount: string;
  action: "0" | "1";
  signTime?: string;
  error?: string;
  badSignature?: boolean;
}) {
  const clickTransId = fields.clickTransId ?? "ct-1";
  const serviceId = fields.serviceId ?? "svc-1";
  const merchantPrepareId = fields.merchantPrepareId ?? "";
  const signTime = fields.signTime ?? "2026-01-01 00:00:00";
  const action = fields.action;

  const signString = fields.badSignature
    ? "0".repeat(32)
    : md5(
        clickTransId +
          serviceId +
          SECRET +
          fields.merchantTransId +
          (action === "1" ? merchantPrepareId : "") +
          fields.amount +
          action +
          signTime
      );

  const form = new FormData();
  form.set("click_trans_id", clickTransId);
  form.set("service_id", serviceId);
  form.set("merchant_trans_id", fields.merchantTransId);
  if (action === "1") form.set("merchant_prepare_id", merchantPrepareId);
  form.set("amount", fields.amount);
  form.set("action", action);
  form.set("sign_time", signTime);
  form.set("sign_string", signString);
  form.set("error", fields.error ?? "0");

  return new Request("https://example.com/api/payments/click", { method: "POST", body: form });
}

beforeEach(() => {
  store = new Map();
  statusUpdateCalls.length = 0;
  dbShouldThrow = false;
  store.set("order-1", {
    totalAmount: 1000,
    status: "pending",
    paymentStatus: "pending",
  });
});

describe("Imzo tekshiruvi", () => {
  it("noto'g'ri imzoda -1 qaytaradi", async () => {
    const res = await POST(
      clickRequest({ merchantTransId: "order-1", amount: "1000", action: "0", badSignature: true })
    );
    const json = await res.json();
    expect(json.error).toBe(-1);
  });
});

describe("action=1 (complete) - Click xato yuborganda", () => {
  it("paymentStatus: failed yozadi VA applyOrderStatusUpdate(orderId, \"cancelled\") chaqiradi", async () => {
    const res = await POST(
      clickRequest({ merchantTransId: "order-1", amount: "1000", action: "1", error: "-5" })
    );
    const json = await res.json();

    expect(json.error).toBe(0);
    expect(statusUpdateCalls).toEqual([{ orderId: "order-1", status: "cancelled" }]);

    const stored = store.get("order-1")!;
    expect(stored.paymentStatus).toBe("failed");
    expect(stored.status).toBe("cancelled");
  });

  it("allaqachon bekor qilingan buyurtmada ERR_CANCELLED qaytaradi va qayta chaqirmaydi", async () => {
    store.set("order-1", { totalAmount: 1000, status: "cancelled", paymentStatus: "pending" });
    const res = await POST(
      clickRequest({ merchantTransId: "order-1", amount: "1000", action: "1", error: "-5" })
    );
    const json = await res.json();
    expect(json.error).toBe(-9);
    expect(statusUpdateCalls).toEqual([]);
  });
});

describe("action=1 (complete) - muvaffaqiyatli", () => {
  it("paymentStatus: paid qo'yadi", async () => {
    const res = await POST(clickRequest({ merchantTransId: "order-1", amount: "1000", action: "1" }));
    const json = await res.json();
    expect(json.error).toBe(0);
    expect(store.get("order-1")!.paymentStatus).toBe("paid");
    expect(statusUpdateCalls).toEqual([]);
  });
});

describe("Ichki xato", () => {
  it("HTTP 500 qaytaradi (-1 emas) - Click qayta urinishi uchun", async () => {
    dbShouldThrow = true;
    const res = await POST(clickRequest({ merchantTransId: "order-1", amount: "1000", action: "0" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe(-1);
  });
});
