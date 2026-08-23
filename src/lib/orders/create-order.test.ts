import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DELIVERY_SETTINGS } from "@/types/promo";

/**
 * `createOrder` - BUYURTMA YARATISHNING YAGONA YO'LI.
 *
 * Payme/Click bekor qilish oqimi to'g'ri ishlashi uchun buyurtma
 * dastlab TO'G'RI holatda yaratilishi kerak: `paymentMethod: "online"`
 * bo'lsa `paymentStatus: "pending"`, `status: "pending"`,
 * `stockReturned: false` - shundagina keyinroq `applyOrderStatusUpdate`
 * zaxirani to'g'ri qaytaradi. Bu yerda zaxira tekshiruvi va boshlang'ich
 * holat sinaladi.
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
let autoCounter = 0;

function resetStores() {
  stores = { orders: new Map(), products: new Map(), stats: new Map() };
  autoCounter = 0;
}
resetStores();

function makeRef(collection: string, id: string): Ref & { set: (v: unknown) => Promise<void>; update: (p: Record<string, unknown>) => Promise<void> } {
  return {
    collection,
    id,
    set: async (value: unknown) => {
      stores[collection]!.set(id, value as Record<string, unknown>);
    },
    update: async (patch: Record<string, unknown>) => {
      const prev = stores[collection]!.get(id) ?? {};
      stores[collection]!.set(id, { ...prev, ...applyFieldValues(prev, patch) });
    },
  };
}

const fakeDb = {
  collection: (name: string) => ({
    doc: (id?: string) => makeRef(name, id ?? `auto-${autoCounter++}`),
  }),
  runTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
    const tx = {
      get: async (ref: Ref) => ({
        exists: stores[ref.collection]!.has(ref.id),
        id: ref.id,
        data: () => stores[ref.collection]!.get(ref.id),
      }),
      update: (ref: Ref, patch: Record<string, unknown>) => {
        const prev = stores[ref.collection]!.get(ref.id) ?? {};
        stores[ref.collection]!.set(ref.id, { ...prev, ...applyFieldValues(prev, patch) });
      },
      set: (ref: Ref, patch: Record<string, unknown>) => {
        const prev = stores[ref.collection]!.get(ref.id) ?? {};
        stores[ref.collection]!.set(ref.id, { ...prev, ...applyFieldValues(prev, patch) });
      },
    };
    return fn(tx);
  },
};

let pricingSettings = { retailMarkupPercent: 5, minOrderAmount: 0 };

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { increment: (n: number) => ({ __increment: n }) },
}));
vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: () => fakeDb }));
vi.mock("@/lib/telegram/bot", () => ({ sendTopicMessage: vi.fn(async () => ({ message_id: 555 })) }));
vi.mock("@/lib/telegram/templates", () => ({ formatOrderMessage: () => "" }));
vi.mock("@/lib/telegram/keyboard", () => ({ buildOrderActionKeyboard: () => undefined }));
vi.mock("@/lib/orders/pricing", () => ({
  getDeliverySettings: async () => DEFAULT_DELIVERY_SETTINGS,
}));
vi.mock("@/lib/products/pricing-settings", () => ({
  getPricingSettings: async () => pricingSettings,
}));
const recordStockMoves = vi.fn(async (_moves: unknown[]) => {});
vi.mock("@/lib/inventory/stock-moves", () => ({ recordStockMoves: (moves: unknown[]) => recordStockMoves(moves) }));

const { createOrder, OrderValidationError } = await import("./create-order");

function baseProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "prod-1",
    name: "Kran",
    price: 10000,
    costPrice: 8000,
    discountPrice: null,
    discountUntil: null,
    stock: 5,
    salesCount: 0,
    isActive: true,
    isDraft: false,
    thumbnailUrl: "https://example.com/1.jpg",
    ...overrides,
  };
}

beforeEach(() => {
  resetStores();
  recordStockMoves.mockClear();
  pricingSettings = { retailMarkupPercent: 5, minOrderAmount: 0 };
  stores.products!.set("prod-1", baseProduct());
});

describe("boshlang'ich to'lov holati", () => {
  it("onlayn to'lovda paymentStatus: pending", async () => {
    const order = await createOrder({
      customerName: "Ali",
      phoneNumber: "+998901234567",
      items: [{ productId: "prod-1", name: "Kran", price: 10000, quantity: 2, thumbnailUrl: "" }],
      paymentMethod: "online",
    });

    expect(order.paymentStatus).toBe("pending");
    expect(order.status).toBe("pending");
    expect(order.stockReturned).toBe(false);
  });

  it("naqd to'lovda paymentStatus: not_required", async () => {
    const order = await createOrder({
      customerName: "Ali",
      phoneNumber: "+998901234567",
      items: [{ productId: "prod-1", name: "Kran", price: 10000, quantity: 2, thumbnailUrl: "" }],
      paymentMethod: "cash",
    });

    expect(order.paymentStatus).toBe("not_required");
  });
});

describe("zaxira tekshiruvi", () => {
  it("yetarli zaxira bo'lsa mahsulot va statistika yangilanadi", async () => {
    await createOrder({
      customerName: "Ali",
      phoneNumber: "+998901234567",
      items: [{ productId: "prod-1", name: "Kran", price: 10000, quantity: 2, thumbnailUrl: "" }],
      paymentMethod: "cash",
    });

    expect(stores.products!.get("prod-1")!.stock).toBe(3); // 5 - 2
    expect(stores.products!.get("prod-1")!.salesCount).toBe(2);
    expect(recordStockMoves).toHaveBeenCalledTimes(1);
  });

  it("zaxira yetmasa OrderValidationError otadi va hech narsa saqlanmaydi", async () => {
    await expect(
      createOrder({
        customerName: "Ali",
        phoneNumber: "+998901234567",
        items: [{ productId: "prod-1", name: "Kran", price: 10000, quantity: 99, thumbnailUrl: "" }],
        paymentMethod: "cash",
      })
    ).rejects.toBeInstanceOf(OrderValidationError);

    expect(stores.products!.get("prod-1")!.stock).toBe(5); // o'zgarmagan
    expect(stores.orders!.size).toBe(0);
  });

  it("mahsulot faol bo'lmasa OrderValidationError otadi", async () => {
    stores.products!.set("prod-1", baseProduct({ isActive: false }));
    await expect(
      createOrder({
        customerName: "Ali",
        phoneNumber: "+998901234567",
        items: [{ productId: "prod-1", name: "Kran", price: 10000, quantity: 1, thumbnailUrl: "" }],
        paymentMethod: "cash",
      })
    ).rejects.toBeInstanceOf(OrderValidationError);
  });

  it("eng kam buyurtma summasidan past bo'lsa rad etiladi", async () => {
    pricingSettings = { retailMarkupPercent: 5, minOrderAmount: 100000 };
    await expect(
      createOrder({
        customerName: "Ali",
        phoneNumber: "+998901234567",
        items: [{ productId: "prod-1", name: "Kran", price: 10000, quantity: 1, thumbnailUrl: "" }],
        paymentMethod: "cash",
      })
    ).rejects.toBeInstanceOf(OrderValidationError);
  });
});
