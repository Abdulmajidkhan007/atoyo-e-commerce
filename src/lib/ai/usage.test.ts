import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * AI RASM CHEGARASI.
 *
 * Chegara to'lganda generatsiya to'xtashi shart (balans sezilmay
 * tugab qolmasin), lekin hisoblagich o'zi ishlamay qolsa ish
 * TO'XTAMASLIGI kerak - u yordamchi vosita.
 */

const docs = new Map<string, Record<string, unknown>>();

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { increment: (n: number) => ({ __increment: n }) },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    doc: (path: string) => ({
      get: async () => ({ data: () => docs.get(path) }),
      set: async (value: Record<string, unknown>) => {
        const previous = docs.get(path) ?? {};
        const next: Record<string, unknown> = { ...previous };
        for (const [key, item] of Object.entries(value)) {
          const increment = (item as { __increment?: number })?.__increment;
          next[key] =
            typeof increment === "number" ? Number(previous[key] ?? 0) + increment : item;
        }
        docs.set(path, next);
      },
    }),
  }),
}));

const {
  assertImageQuota,
  currentMonthKey,
  estimateCostUsd,
  getImageUsage,
  getTokenUsage,
  recordImageUse,
  recordTokenUse,
  setImageLimit,
} = await import("./usage");

const monthPath = () => `aiUsage/${currentMonthKey()}`;

beforeEach(() => docs.clear());

describe("AI rasm chegarasi", () => {
  it("standart chegara 200 ta", async () => {
    expect((await getImageUsage()).limit).toBe(200);
  });

  it("chizilgan rasmlar sanaladi", async () => {
    await recordImageUse(1);
    await recordImageUse(2);
    expect((await getImageUsage()).used).toBe(3);
  });

  it("chegara to'lmagan bo'lsa o'tkazadi", async () => {
    await setImageLimit(5);
    await recordImageUse(4);
    await expect(assertImageQuota()).resolves.toBeUndefined();
  });

  it("chegara to'lganda to'xtatadi va sababini aytadi", async () => {
    await setImageLimit(2);
    await recordImageUse(2);
    await expect(assertImageQuota()).rejects.toThrow(/chegarasi to'ldi/);
  });

  it("chegara 0 bo'lsa - cheksiz", async () => {
    await setImageLimit(0);
    await recordImageUse(1000);
    await expect(assertImageQuota()).resolves.toBeUndefined();
  });

  it("hisob boshqa oyda alohida turadi", async () => {
    await recordImageUse(3);
    expect(docs.get(monthPath())?.images).toBe(3);
    expect(docs.has("aiUsage/1999-01")).toBe(false);
  });
});

describe("estimateCostUsd", () => {
  it("model narxnomasi bo'yicha hisoblaydi", () => {
    // Opus 5: kirim 5 $/M, chiqim 25 $/M.
    const cost = estimateCostUsd("claude-opus-5", {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(30, 6);
  });

  it("keshdan o'qilgan token arzon, keshga yozilgani qimmat", () => {
    const read = estimateCostUsd("claude-opus-5", { cache_read_input_tokens: 1_000_000 });
    const write = estimateCostUsd("claude-opus-5", { cache_creation_input_tokens: 1_000_000 });
    expect(read).toBeCloseTo(0.5, 6);
    expect(write).toBeCloseTo(6.25, 6);
  });

  it("notanish model uchun eng qimmat narxni oladi (kam ko'rsatmaslik uchun)", () => {
    const cost = estimateCostUsd("claude-kelajak-9", { input_tokens: 1_000_000 });
    expect(cost).toBeCloseTo(10, 6);
  });

  it("bo'sh hisobda 0 qaytaradi", () => {
    expect(estimateCostUsd("claude-opus-5", {})).toBe(0);
  });
});

describe("token sarfi", () => {
  it("so'rov, tokenlar va taxminiy summa jamlanadi", async () => {
    await recordTokenUse("claude-opus-5", { input_tokens: 1000, output_tokens: 200 });
    await recordTokenUse("claude-opus-5", { input_tokens: 1000, output_tokens: 200 });

    const usage = await getTokenUsage();
    expect(usage.requests).toBe(2);
    expect(usage.inputTokens).toBe(2000);
    expect(usage.outputTokens).toBe(400);
    expect(usage.costUsd).toBeCloseTo(2 * (1000 * 5 + 200 * 25) / 1_000_000, 8);
  });

  it("usage bo'lmasa hech narsa yozmaydi", async () => {
    await recordTokenUse("claude-opus-5", null);
    expect((await getTokenUsage()).requests).toBe(0);
  });
});
