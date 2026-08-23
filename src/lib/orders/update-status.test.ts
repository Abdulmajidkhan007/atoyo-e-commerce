import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `applyOrderStatusUpdate` - BUYURTMA HOLATINI YAGONA YO'L BILAN
 * O'ZGARTIRISH. Diqqat markazida `stockReturned` bayrog'i: buyurtma
 * bekor qilinganda zaxira BIR MARTA qaytishi kerak - Payme/Click
 * webhook'lari qayta-qayta CancelTransaction/xato yuborishi mumkin,
 * shu payt zaxira ikki marta qaytib ketmasligi shart.
 */

interface Ref {
  collection: string;
  id: string;
}

function applyFieldValues(
  prev: Record<string, unknown> | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    const inc = (value as { __increment?: number } | undefined)?.__increment;
    result[key] = typeof inc === "number" ? Number((prev ?? {})[key] ?? 0) + inc : value;
  }
  return result;
}

let stores: Record<string, Map<string, Record<string, unknown>>>;

function resetStores() {
  stores = { orders: new Map(), products: new Map(), stats: new Map(), users: new Map() };
}
resetStores();

const fakeDb = {
  collection: (name: string) => ({
    doc: (id: string) => ({
      collection: name,
      id,
      get: async () => ({ exists: stores[name]!.has(id), data: () => stores[name]!.get(id) }),
      update: async (patch: Record<string, unknown>) => {
        const prev = stores[name]!.get(id) ?? {};
        stores[name]!.set(id, { ...prev, ...applyFieldValues(prev, patch) });
      },
    }),
  }),
  batch: () => {
    const ops: { ref: Ref; patch: Record<string, unknown> }[] = [];
    return {
      update: (ref: Ref, patch: Record<string, unknown>) => ops.push({ ref, patch }),
      set: (ref: Ref, patch: Record<string, unknown>) => ops.push({ ref, patch }),
      commit: async () => {
        for (const op of ops) {
          const store = stores[op.ref.collection]!;
          const prev = store.get(op.ref.id) ?? {};
          store.set(op.ref.id, { ...prev, ...applyFieldValues(prev, op.patch) });
        }
      },
    };
  },
};

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { increment: (n: number) => ({ __increment: n }) },
}));
vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: () => fakeDb }));
vi.mock("@/lib/telegram/bot", () => ({
  editTopicMessageText: vi.fn(async () => {}),
  sendChatMessage: vi.fn(async () => {}),
}));
vi.mock("@/lib/telegram/stickers", () => ({
  sendSlotSticker: vi.fn(async () => {}),
  slotForOrderStatus: () => null,
}));
vi.mock("@/lib/telegram/keyboard", () => ({ buildOrderActionKeyboard: () => undefined }));
vi.mock("@/lib/telegram/templates", () => ({ formatOrderMessage: () => "" }));
vi.mock("@/lib/email/mailer", () => ({ sendOrderStatusEmail: vi.fn(async () => {}) }));
vi.mock("@/lib/notifications/push", () => ({ sendPushToUser: vi.fn(async () => {}) }));
vi.mock("@/lib/sms/sender", () => ({ isSmsConfigured: () => false, sendSms: vi.fn(async () => {}) }));

const recordStockMoves = vi.fn(async (_moves: unknown[]) => {});
vi.mock("@/lib/inventory/stock-moves", () => ({ recordStockMoves: (moves: unknown[]) => recordStockMoves(moves) }));

const { applyOrderStatusUpdate } = await import("./update-status");

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    userId: null,
    customerName: "Ali",
    phoneNumber: "+998901234567",
    items: [
      { productId: "prod-1", name: "Kran", price: 1000, quantity: 3, thumbnailUrl: "" },
    ],
    totalAmount: 3000,
    currency: "UZS",
    location: null,
    deliveryAddress: null,
    paymentMethod: "online",
    paymentStatus: "failed",
    status: "pending",
    stockReturned: false,
    telegramMessageId: null,
    customerChatId: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

beforeEach(() => {
  resetStores();
  recordStockMoves.mockClear();
  stores.orders!.set("order-1", baseOrder());
  stores.products!.set("prod-1", { stock: 5, salesCount: 3 });
  stores.stats!.set("summary", { totalOrders: 10, totalRevenue: 100000 });
});

describe("stockReturned", () => {
  it("bekor qilinganda zaxira qaytadi va stockReturned true bo'ladi", async () => {
    const updated = await applyOrderStatusUpdate("order-1", "cancelled");

    expect(updated?.stockReturned).toBe(true);
    expect(stores.orders!.get("order-1")!.stockReturned).toBe(true);
    expect(stores.orders!.get("order-1")!.status).toBe("cancelled");
    expect(stores.products!.get("prod-1")!.stock).toBe(8); // 5 + 3
    expect(stores.products!.get("prod-1")!.salesCount).toBe(0); // 3 - 3
    expect(stores.stats!.get("summary")!.totalOrders).toBe(9);
    expect(stores.stats!.get("summary")!.totalRevenue).toBe(97000);
    expect(recordStockMoves).toHaveBeenCalledTimes(1);
  });

  it("ikkinchi marta \"cancelled\" chaqirilganda zaxira QAYTA qaytmaydi", async () => {
    await applyOrderStatusUpdate("order-1", "cancelled");
    recordStockMoves.mockClear();

    // Payme/Click qayta-qayta CancelTransaction/xato yuborishi mumkin -
    // ikkinchi chaqiruv zaxirani yana oshirib yubormasligi shart.
    await applyOrderStatusUpdate("order-1", "cancelled");

    expect(stores.products!.get("prod-1")!.stock).toBe(8);
    expect(stores.stats!.get("summary")!.totalOrders).toBe(9);
    expect(recordStockMoves).not.toHaveBeenCalled();
  });

  it("boshqa holatga o'tishda (masalan \"approved\") zaxiraga tegilmaydi", async () => {
    await applyOrderStatusUpdate("order-1", "approved");

    expect(stores.orders!.get("order-1")!.status).toBe("approved");
    expect(stores.orders!.get("order-1")!.stockReturned).toBe(false);
    expect(stores.products!.get("prod-1")!.stock).toBe(5);
    expect(recordStockMoves).not.toHaveBeenCalled();
  });

  it("buyurtma topilmasa null qaytaradi", async () => {
    const result = await applyOrderStatusUpdate("no-such-order", "cancelled");
    expect(result).toBeNull();
  });
});
