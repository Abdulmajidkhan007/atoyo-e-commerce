import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * TANNARX MAXFIYLIGI (AUDIT 2.1).
 *
 * Buyurtmaning qolgan mantiqi (zaxira, promokod, eng kam summa)
 * `create-order.test.ts` da sinaladi — bu fayl ATAYLAB alohida:
 * ikkala to'plamning Firestore "soxta bazasi" boshqacha qurilgan,
 * bitta faylga qo'shilsa bir-birini buzardi.
 */

/**
 * TANNARX BUYURTMA HUJJATIDA BO'LMASLIGI SHART.
 *
 * Ilgari `createOrder()` `items[].costPrice`ni buyurtma hujjatining
 * o'ziga yozardi - mijoz uni o'z profilida client SDK bilan
 * (`subscribeToUserOrders`) ochiq o'qiy olardi (CLAUDE.md 1-qoidasi
 * buzilishi). Endi tannarx alohida yopiq `orderCosts/{orderId}`
 * hujjatiga tushadi, `orders` esa tannarxsiz saqlanadi.
 */

type FakeDoc = Record<string, unknown>;

const collections: Record<string, Map<string, FakeDoc>> = {
  products: new Map(),
  orders: new Map(),
  orderCosts: new Map(),
  stats: new Map(),
};

let autoId = 0;

function applyUpdate(prev: FakeDoc, value: Record<string, unknown>): FakeDoc {
  const next: FakeDoc = { ...prev };
  for (const [key, item] of Object.entries(value)) {
    const increment = (item as { __increment?: number } | undefined)?.__increment;
    next[key] = typeof increment === "number" ? Number(prev[key] ?? 0) + increment : item;
  }
  return next;
}

function makeRef(collectionName: string, id?: string) {
  const docId = id ?? `auto${autoId++}`;
  return {
    id: docId,
    _collection: collectionName,
    async get() {
      const data = collections[collectionName]!.get(docId);
      return { id: docId, exists: data !== undefined, data: () => data };
    },
    async set(value: FakeDoc) {
      collections[collectionName]!.set(docId, value);
    },
    async update(value: Record<string, unknown>) {
      const prev = collections[collectionName]!.get(docId) ?? {};
      collections[collectionName]!.set(docId, applyUpdate(prev, value));
    },
  };
}

type FakeRef = ReturnType<typeof makeRef>;

const fakeDb = {
  collection(name: string) {
    return { doc: (id?: string) => makeRef(name, id) };
  },
  doc(path: string) {
    const [collectionName, id] = path.split("/");
    return makeRef(collectionName!, id);
  },
  async runTransaction(fn: (tx: unknown) => Promise<unknown>) {
    const tx = {
      get: (ref: FakeRef) => ref.get(),
      set: (ref: FakeRef, value: FakeDoc) => {
        collections[ref._collection]!.set(ref.id, value);
      },
      update: (ref: FakeRef, value: Record<string, unknown>) => {
        const prev = collections[ref._collection]!.get(ref.id) ?? {};
        collections[ref._collection]!.set(ref.id, applyUpdate(prev, value));
      },
    };
    return fn(tx);
  },
};

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { increment: (n: number) => ({ __increment: n }) },
}));
vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: () => fakeDb }));
vi.mock("@/lib/telegram/bot", () => ({ sendTopicMessage: async () => ({ message_id: 1 }) }));
vi.mock("@/lib/telegram/templates", () => ({ formatOrderMessage: () => "" }));
vi.mock("@/lib/telegram/keyboard", () => ({ buildOrderActionKeyboard: () => ({}) }));
vi.mock("@/lib/orders/pricing", () => ({
  getDeliverySettings: async () => ({ fee: 0, freeFrom: 0, enabled: false, zones: [] }),
}));
vi.mock("@/lib/products/pricing-settings", () => ({
  getPricingSettings: async () => ({ retailMarkupPercent: 5, minOrderAmount: 0 }),
}));
vi.mock("@/lib/inventory/stock-moves", () => ({ recordStockMoves: async () => {} }));

const { createOrder } = await import("./create-order");

function seedProduct(id: string, data: FakeDoc) {
  collections.products!.set(id, data);
}

beforeEach(() => {
  for (const map of Object.values(collections)) map.clear();
  autoId = 0;
});

describe("createOrder - tannarx maxfiyligi", () => {
  it("oddiy mahsulot: costPrice buyurtmaga emas, orderCosts ga tushadi", async () => {
    seedProduct("p1", {
      name: "Kran",
      isActive: true,
      isDraft: false,
      stock: 10,
      price: 100_000,
      costPrice: 70_000,
      discountPrice: null,
      discountUntil: null,
      thumbnailUrl: "https://example.com/1.jpg",
    });

    const order = await createOrder({
      customerName: "Ali Aliyev",
      phoneNumber: "+998901234567",
      items: [{ productId: "p1", name: "Kran", price: 100_000, quantity: 2, thumbnailUrl: "" }],
      role: "user",
    });

    expect(order.items).toHaveLength(1);
    expect(order.items[0]).not.toHaveProperty("costPrice");

    const savedOrder = collections.orders!.get(order.id);
    expect(savedOrder).toBeDefined();
    const savedItems = savedOrder!.items as Record<string, unknown>[];
    expect(savedItems[0]).not.toHaveProperty("costPrice");

    const costs = collections.orderCosts!.get(order.id);
    expect(costs).toBeDefined();
    expect(costs!.items).toEqual([{ productId: "p1", variantId: null, costPrice: 70_000 }]);
  });

  it("turli (variant) mahsulot: tur bo'yicha costPrice orderCosts ga tushadi", async () => {
    seedProduct("p2", {
      name: "Parda",
      isActive: true,
      isDraft: false,
      stock: 10,
      price: 50_000,
      costPrice: 30_000,
      discountPrice: null,
      discountUntil: null,
      thumbnailUrl: "",
      variantAxes: [{ key: "olcham", label: "O'lcham", values: ["50x60"] }],
      variants: [{ id: "50x60", options: { olcham: "50x60" }, price: 55_000, costPrice: 33_000, stock: 5 }],
    });

    const order = await createOrder({
      customerName: "Vali Valiyev",
      phoneNumber: "+998901234568",
      items: [
        {
          productId: "p2",
          variantId: "50x60",
          name: "Parda",
          price: 55_000,
          quantity: 1,
          thumbnailUrl: "",
        },
      ],
      role: "user",
    });

    expect(order.items[0]).not.toHaveProperty("costPrice");

    const costs = collections.orderCosts!.get(order.id);
    expect(costs!.items).toEqual([{ productId: "p2", variantId: "50x60", costPrice: 33_000 }]);
  });
});
