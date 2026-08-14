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

const { assertImageQuota, currentMonthKey, getImageUsage, recordImageUse, setImageLimit } =
  await import("./usage");

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
