import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * PAYME WEBHOOK.
 *
 * `docs/AUDIT.md` 2.6: `CancelTransaction` faqat `paymentStatus: "failed"`
 * yozardi - `order.status` "pending" bo'lib qolar, zaxira qaytmasdi. Endi
 * u `applyOrderStatusUpdate(orderId, "cancelled")` ni chaqiradi (bir marta,
 * takroriy Cancel qayta ishlamasin).
 */

interface StoredOrder {
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymeTransactionId?: string | null;
  paymeState?: number;
  paymeCreateTime?: number;
  paymePerformTime?: number;
  paymeCancelTime?: number;
  [key: string]: unknown;
}

let store = new Map<string, StoredOrder>();
const statusUpdateCalls: { orderId: string; status: string }[] = [];

function docHandle(id: string) {
  return {
    id,
    get: async () => ({ exists: store.has(id), id, data: () => store.get(id) }),
    update: async (patch: Record<string, unknown>) => {
      store.set(id, { ...(store.get(id) as StoredOrder), ...patch } as StoredOrder);
    },
  };
}

const fakeDb = {
  collection: (name: string) => {
    if (name !== "orders") throw new Error(`kutilmagan kolleksiya: ${name}`);
    return {
      doc: (id: string) => docHandle(id),
      where: (field: string, _op: string, value: unknown) => ({
        limit: (n: number) => ({
          get: async () => {
            const matches = [...store.entries()].filter(([, data]) => data[field] === value).slice(0, n);
            return {
              empty: matches.length === 0,
              docs: matches.map(([id, data]) => ({
                id,
                data: () => data,
                ref: {
                  update: async (patch: Record<string, unknown>) => {
                    store.set(id, { ...(store.get(id) as StoredOrder), ...patch } as StoredOrder);
                  },
                },
              })),
            };
          },
        }),
      }),
    };
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

process.env.PAYME_KEY = "test-payme-key";
const AUTH_HEADER = `Basic ${Buffer.from("Paycom:test-payme-key").toString("base64")}`;

const { POST } = await import("./route");

function rpc(method: string, params: Record<string, unknown> = {}, id: number = 1) {
  return new Request("https://example.com/api/payments/payme", {
    method: "POST",
    headers: { authorization: AUTH_HEADER, "content-type": "application/json" },
    body: JSON.stringify({ id, method, params }),
  });
}

beforeEach(() => {
  store = new Map();
  statusUpdateCalls.length = 0;
  store.set("order-1", {
    totalAmount: 1000,
    status: "pending",
    paymentStatus: "pending",
  });
});

describe("Authorization", () => {
  it("Basic sarlavha noto'g'ri bo'lsa -32504 qaytaradi", async () => {
    const req = new Request("https://example.com/api/payments/payme", {
      method: "POST",
      headers: { authorization: "Basic xxxxx", "content-type": "application/json" },
      body: JSON.stringify({ id: 1, method: "CheckPerformTransaction", params: {} }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.error.code).toBe(-32504);
  });
});

describe("CancelTransaction", () => {
  it("bekor qilinganda applyOrderStatusUpdate(orderId, \"cancelled\") chaqiradi", async () => {
    // Avval CreateTransaction - tranzaksiya yaratiladi.
    await POST(rpc("CreateTransaction", { id: "tx-1", amount: 100000, account: { order_id: "order-1" } }));
    // Bekor qilish.
    const res = await POST(rpc("CancelTransaction", { id: "tx-1" }));
    const json = await res.json();

    expect(json.result.state).toBe(-1);
    expect(statusUpdateCalls).toEqual([{ orderId: "order-1", status: "cancelled" }]);

    const stored = store.get("order-1")!;
    expect(stored.paymentStatus).toBe("failed");
    expect(stored.status).toBe("cancelled");
  });

  it("allaqachon bekor qilingan buyurtmada applyOrderStatusUpdate qayta chaqirilmaydi", async () => {
    await POST(rpc("CreateTransaction", { id: "tx-1", amount: 100000, account: { order_id: "order-1" } }));
    await POST(rpc("CancelTransaction", { id: "tx-1" }));
    statusUpdateCalls.length = 0;

    // Payme qayta CancelTransaction yuborishi mumkin (retry).
    const res = await POST(rpc("CancelTransaction", { id: "tx-1" }));
    expect(res.status).toBe(200);
    expect(statusUpdateCalls).toEqual([]);
  });

  it("to'langan (state=2) tranzaksiya bekor qilinganda ham cancelled qiladi", async () => {
    await POST(rpc("CreateTransaction", { id: "tx-1", amount: 100000, account: { order_id: "order-1" } }));
    await POST(rpc("PerformTransaction", { id: "tx-1" }));

    const res = await POST(rpc("CancelTransaction", { id: "tx-1" }));
    const json = await res.json();

    expect(json.result.state).toBe(-2);
    expect(statusUpdateCalls).toEqual([{ orderId: "order-1", status: "cancelled" }]);
  });

  it("tranzaksiya topilmasa ERR_TX_NOT_FOUND qaytaradi", async () => {
    const res = await POST(rpc("CancelTransaction", { id: "no-such-tx" }));
    const json = await res.json();
    expect(json.error.code).toBe(-31003);
    expect(statusUpdateCalls).toEqual([]);
  });
});
