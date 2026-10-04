import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/api/orders/quick` — ROUTE darajasidagi test (AUDIT-ISHLARI 14-band).
 * Qulflangan qoidalar (CLAUDE.md 15-band):
 *  - bot tuzog'i → `{received:true}`, buyurtma SAQLANMAYDI;
 *  - IP limiti har so'rovni sanaydi; telefon va umumiy limit faqat
 *    MUVAFFAQIYATLI buyurtmani;
 *  - takror qator rad etiladi, savat 1-20 qator;
 *  - mehmon DONA narx oladi (rol yo'q, `guest: true`).
 */

const createOrderMock = vi.fn();
const reportErrorMock = vi.fn(async () => {});
const counters = new Map<string, number>();
let currentUser: { uid: string; email: string; role: string } | null = null;

vi.mock("@/lib/orders/create-order", () => ({
  createOrder: (input: unknown) => createOrderMock(input),
  OrderValidationError: class OrderValidationError extends Error {},
}));
vi.mock("@/lib/ops/report-error", () => ({ reportError: (...a: unknown[]) => reportErrorMock(...(a as [])) }));
vi.mock("@/lib/firebase/session", () => ({ getAppUserFromRequest: async () => currentUser }));
vi.mock("@/lib/rate-limit", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    checkRateLimit: async ({ key, limit }: { key: string; limit: number }) => {
      const used = counters.get(key) ?? 0;
      if (used >= limit) return { allowed: false };
      counters.set(key, used + 1);
      return { allowed: true };
    },
    peekRateLimit: async ({ key, limit }: { key: string; limit: number }) => ({
      allowed: (counters.get(key) ?? 0) < limit,
    }),
  };
});

import { POST } from "./route";
import { MAX_GUEST_ITEMS } from "@/lib/orders/order-schema";

const item = (n: number, quantity = 1) => ({
  productId: `p${n}`,
  name: `Mahsulot ${n}`,
  price: 1000,
  quantity,
  thumbnailUrl: "",
});

function body(over: Record<string, unknown> = {}) {
  return {
    customerName: "Ali Valiyev",
    phoneNumber: "+998901234567",
    deliveryAddress: "Toshkent, Chilonzor 5",
    paymentMethod: "cash",
    items: [item(1)],
    ...over,
  };
}

function req(payload: unknown, ip = "1.2.3.4") {
  return new Request("http://localhost/api/orders/quick", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(payload),
  });
}

const keyOf = (prefix: string) => [...counters.keys()].find((k) => k.startsWith(prefix));

beforeEach(() => {
  counters.clear();
  currentUser = null;
  createOrderMock.mockReset();
  createOrderMock.mockResolvedValue({ id: "order-1" });
  reportErrorMock.mockClear();
});

describe("POST /api/orders/quick", () => {
  it("bot tuzog'i: {received:true}, buyurtma saqlanmaydi, limit sanalmaydi", async () => {
    const res = await POST(req(body({ website: "http://spam.example" })));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ received: true });
    expect(createOrderMock).not.toHaveBeenCalled();
    expect(counters.size).toBe(0);
  });

  it("mehmon DONA narx oladi: rol yo'q, guest:true, kalit xeshi yuboriladi", async () => {
    const res = await POST(req(body()));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.orderId).toBe("order-1");
    expect(typeof json.accessToken).toBe("string");
    const arg = createOrderMock.mock.calls[0]![0];
    expect(arg.guest).toBe(true);
    expect(arg.role).toBeUndefined();
    expect(arg.userId).toBeNull();
    expect(typeof arg.accessTokenHash).toBe("string");
    expect(arg.accessTokenHash).not.toBe(json.accessToken);
  });

  it("kirgan mijozda uid va rol biriktiriladi", async () => {
    currentUser = { uid: "u1", email: "a@b.uz", role: "wholesale" };
    await POST(req(body()));
    const arg = createOrderMock.mock.calls[0]![0];
    expect(arg).toMatchObject({ guest: false, userId: "u1", role: "wholesale" });
  });

  it("takror qator rad etiladi (400)", async () => {
    const res = await POST(req(body({ items: [item(1), item(1)] })));
    expect(res.status).toBe(400);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("savat 1-20 qator: 20 qabul, 21 va 0 rad", async () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => item(i));
    expect((await POST(req(body({ items: many(MAX_GUEST_ITEMS) })))).status).toBe(201);
    expect((await POST(req(body({ items: many(MAX_GUEST_ITEMS + 1) })))).status).toBe(400);
    expect((await POST(req(body({ items: [] })))).status).toBe(400);
  });

  it("telefon limiti: faqat MUVAFFAQIYATLI buyurtma sanaladi", async () => {
    // Muvaffaqiyatsiz buyurtmalar telefonni bloklamaydi.
    createOrderMock.mockRejectedValue(new Error("db"));
    for (let i = 0; i < 6; i++) {
      expect((await POST(req(body(), `9.9.9.${i}`))).status).toBe(500);
    }
    expect(counters.get("quick-order:phone:+998901234567") ?? 0).toBe(0);
    expect(counters.get("quick-order:global") ?? 0).toBe(0);

    createOrderMock.mockResolvedValue({ id: "ok" });
    for (let i = 0; i < 5; i++) {
      expect((await POST(req(body(), `8.8.8.${i}`))).status).toBe(201);
    }
    expect((await POST(req(body(), "8.8.8.99"))).status).toBe(429);
    expect(createOrderMock).toHaveBeenCalledTimes(6 + 5);
  });

  it("IP limiti: har so'rov (xato ham) sanaladi, 21-si 429", async () => {
    createOrderMock.mockRejectedValue(new Error("db"));
    for (let i = 0; i < 20; i++) {
      expect((await POST(req(body({ phoneNumber: `+99890123${1000 + i}` })))).status).toBe(500);
    }
    expect((await POST(req(body({ phoneNumber: "+998907777777" })))).status).toBe(429);
    expect(keyOf("quick-order:ip:")).toBeDefined();
  });

  it("umumiy limit to'lsa: 429 va 'Actions'ga ogohlantirish", async () => {
    counters.set("quick-order:global", 30);
    const res = await POST(req(body()));
    expect(res.status).toBe(429);
    expect(createOrderMock).not.toHaveBeenCalled();
    expect(reportErrorMock).toHaveBeenCalledTimes(1);
  });

  it("noto'g'ri JSON → 400", async () => {
    const bad = new Request("http://localhost/api/orders/quick", { method: "POST", body: "{" });
    expect((await POST(bad)).status).toBe(400);
  });
});
