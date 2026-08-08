import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SO'ROV TUZILISHI TESTI.
 *
 * Katalog o'qishi mijoz tomonidan serverga ko'chirildi. Sandbox'da
 * Firestore kalitlari yo'q, ya'ni haqiqiy bazada sinab ko'rish
 * imkoni yo'q - shuning uchun bu yerda SOXTA Firestore qo'yiladi va
 * qanday `where` / `orderBy` / `startAfter` chaqirilgani tekshiriladi.
 *
 * Maqsad: filtr va saralash avvalgidek BAZA TOMONIDA qolgani va
 * mijozdan kelgan qiymatlar to'g'ri joyga tushgani.
 */

interface Call {
  method: string;
  args: unknown[];
}

let calls: Call[] = [];
let docs: { id: string; data: () => Record<string, unknown> }[] = [];
let cursorDocExists = true;

function fakeQuery() {
  const chain: Record<string, unknown> = {};
  for (const method of ["where", "orderBy", "startAfter", "limit"]) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  chain.get = () => Promise.resolve({ docs });
  return chain;
}

const fakeCollection = {
  ...fakeQuery(),
  doc: (id: string) => ({
    get: () => Promise.resolve({ id, exists: cursorDocExists, data: () => ({}) }),
  }),
};

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection: () => fakeCollection }),
}));

const { queryProductsPage, searchProductsServer } = await import("./catalog-server");

function argsOf(method: string): unknown[][] {
  return calls.filter((call) => call.method === method).map((call) => call.args);
}

beforeEach(() => {
  calls = [];
  docs = [];
  cursorDocExists = true;
});

describe("queryProductsPage", () => {
  it("faqat SAYTDA OCHIQ mahsulotlarni oladi", async () => {
    await queryProductsPage({}, 24, null);
    expect(argsOf("where")).toContainEqual(["isActive", "==", true]);
  });

  it("hamma filtrni baza tomoniga uzatadi", async () => {
    await queryProductsPage(
      {
        category: "smesitel",
        brand: "Atoyo",
        material: "metall",
        manufacturerCountry: "Xitoy",
        inStockOnly: true,
        minPrice: 50_000,
        maxPrice: 150_000,
      },
      24,
      null
    );

    const where = argsOf("where");
    expect(where).toContainEqual(["category", "==", "smesitel"]);
    expect(where).toContainEqual(["brand", "==", "Atoyo"]);
    expect(where).toContainEqual(["material", "==", "metall"]);
    expect(where).toContainEqual(["manufacturerCountry", "==", "Xitoy"]);
    expect(where).toContainEqual(["stock", ">", 0]);
    expect(where).toContainEqual(["price", ">=", 50_000]);
    expect(where).toContainEqual(["price", "<=", 150_000]);
  });

  it("saralash turlari to'g'ri maydonga tushadi", async () => {
    const cases: [Parameters<typeof queryProductsPage>[0]["sortBy"], unknown[]][] = [
      ["price-asc", ["price", "asc"]],
      ["price-desc", ["price", "desc"]],
      ["popular", ["salesCount", "desc"]],
      ["newest", ["createdAt", "desc"]],
      [undefined, ["createdAt", "desc"]],
    ];

    for (const [sortBy, expected] of cases) {
      calls = [];
      await queryProductsPage({ sortBy }, 24, null);
      expect(argsOf("orderBy")).toContainEqual(expected);
    }
  });

  it("sahifa o'lchami `limit` ga beriladi", async () => {
    await queryProductsPage({}, 12, null);
    expect(argsOf("limit")).toContainEqual([12]);
  });

  it("kursor berilsa `startAfter` chaqiriladi va keyingi kursor qaytadi", async () => {
    docs = [
      { id: "a", data: () => ({ name: "A" }) },
      { id: "b", data: () => ({ name: "B" }) },
    ];
    const page = await queryProductsPage({}, 2, "oldingi");

    expect(argsOf("startAfter")).toHaveLength(1);
    expect(page.nextCursor).toBe("b");
    // Ikkita hujjat keldi, so'ralgani ham ikkita - demak yana bor.
    expect(page.hasMore).toBe(true);
    expect(page.products.map((product) => product.id)).toEqual(["a", "b"]);
  });

  it("kursor hujjati o'chirilgan bo'lsa so'rov yiqilmaydi", async () => {
    cursorDocExists = false;
    const page = await queryProductsPage({}, 24, "yoq-boldi");
    expect(argsOf("startAfter")).toHaveLength(0);
    expect(page.products).toEqual([]);
  });

  it("to'liq bo'lmagan sahifada `hasMore` yolg'on", async () => {
    docs = [{ id: "a", data: () => ({}) }];
    const page = await queryProductsPage({}, 24, null);
    expect(page.hasMore).toBe(false);
  });
});

describe("searchProductsServer", () => {
  it("bo'sh so'rovda bazaga bormaydi", async () => {
    expect(await searchProductsServer("   ")).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("prefiks oralig'i va so'z indeksi bo'yicha qidiradi", async () => {
    await searchProductsServer("dush", 10);
    const where = argsOf("where");
    expect(where).toContainEqual(["nameSearchIndex", ">=", "dush"]);
    // Yuqori chegara `\uf8ff` bilan - prefiks oralig'i.
    expect(where).toContainEqual(["nameSearchIndex", "<=", "dush\uf8ff"]);
    // `nameTokens` so'rovi ham ketadi (so'z variantlari bilan).
    expect(where.some((args) => args[0] === "nameTokens" && args[1] === "array-contains-any")).toBe(
      true
    );
  });

  it("qidiruv so'zi kichik harfga keltiriladi", async () => {
    await searchProductsServer("DUSH");
    expect(argsOf("where")).toContainEqual(["nameSearchIndex", ">=", "dush"]);
  });

  it("takrorlangan hujjatni ikki marta qaytarmaydi", async () => {
    docs = [
      { id: "a", data: () => ({ isActive: true }) },
      { id: "a", data: () => ({ isActive: true }) },
    ];
    const results = await searchProductsServer("dush", 10);
    expect(results.map((product) => product.id)).toEqual(["a"]);
  });

  it("saytda yopiq mahsulot natijaga tushmaydi", async () => {
    docs = [{ id: "a", data: () => ({ isActive: false }) }];
    expect(await searchProductsServer("dush", 10)).toEqual([]);
  });
});
