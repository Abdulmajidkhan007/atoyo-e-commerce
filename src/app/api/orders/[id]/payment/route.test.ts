import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/api/orders/[id]/payment` — ilovadagi to'lov ekrani uchun.
 * Qulflangan: kalitsiz/begona → 404; javobda telefon, manzil,
 * chek yo'li, tannarx YO'Q; keshlanmaydi.
 */

let stored: Record<string, unknown> | null = null;
let allowed = false;

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ allowed: true, remaining: 1 }),
  getClientIp: () => "203.0.113.7",
  ipLimitKey: (ip: string) => ip,
}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: (id: string) => ({
        get: async () => ({ exists: stored !== null, id, data: () => stored }),
      }),
    }),
  }),
}));
vi.mock("@/lib/orders/order-access", () => ({
  canAccessOrder: async (_order: unknown, token: string) => allowed && token === "kalit",
}));

import { GET } from "./route";

const call = (id: string, token = "kalit") =>
  GET(new Request(`http://localhost/api/orders/${id}/payment?t=${token}`), { params: Promise.resolve({ id }) });

describe("GET /api/orders/[id]/payment", () => {
  beforeEach(() => {
    allowed = true;
    stored = {
      status: "pending",
      totalAmount: 65000,
      paymentMethod: "transfer",
      paymentStatus: "pending",
      phoneNumber: "+998901234567",
      deliveryAddress: "Qo'qon",
      customerName: "Ali",
      accessTokenHash: "xesh",
      receipt: { path: "receipts/o1/a.jpg", contentType: "image/jpeg", size: 1, uploadedAt: 1 },
      receiptCount: 1,
      items: [{ productId: "p1", price: 50000, costPrice: 30000, quantity: 1 }],
    };
  });

  it("to'g'ri kalit bilan faqat to'lov maydonlarini beradi", async () => {
    const res = await call("o1");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const data = await res.json();
    expect(data.order).toEqual({
      id: "o1",
      status: "pending",
      totalAmount: 65000,
      paymentMethod: "transfer",
      paymentStatus: "pending",
      hasReceipt: true,
      receiptCount: 1,
    });
    const text = JSON.stringify(data);
    for (const secret of ["phoneNumber", "deliveryAddress", "costPrice", "receipts/", "accessTokenHash", "items"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("noto'g'ri kalit — 404", async () => {
    expect((await call("o1", "boshqa")).status).toBe(404);
  });

  it("buyurtma yo'q — 404", async () => {
    stored = null;
    expect((await call("o1")).status).toBe(404);
  });

  it("yaroqsiz ID — 404 (bazaga bormaydi)", async () => {
    expect((await call("../x")).status).toBe(404);
  });
});
