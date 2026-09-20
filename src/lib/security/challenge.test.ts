import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * JUMBOQ VA "ISHONCH OYNASI".
 *
 * Ilgari har bir saqlashda jumboq chiqardi - admin bitta sozlamani
 * bir necha marta tuzatsa oyna o'nlab marta ochilardi. Endi bir
 * marta yechilsa 10 daqiqa so'ralmaydi. Himoya yo'qolmasligi ham
 * shu yerda qulflanadi: oyna VAQT bilan cheklangan va UID ga
 * bog'langan.
 */

const docs = new Map<string, Record<string, unknown>>();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => ({
          exists: docs.has(`${name}/${id}`),
          data: () => docs.get(`${name}/${id}`),
        }),
        set: async (value: Record<string, unknown>) => {
          docs.set(`${name}/${id}`, value);
        },
        delete: async () => {
          docs.delete(`${name}/${id}`);
        },
      }),
    }),
  }),
}));

const { createChallenge, consumeChallenge, hasActiveGrant } = await import("./challenge");

beforeEach(() => docs.clear());

/** Savol matnidan to'g'ri javobni hisoblab olamiz. */
function solve(question: string): number {
  const [a, sign, b] = question.replace(" = ?", "").split(" ");
  return sign === "×" ? Number(a) * Number(b) : Number(a) + Number(b);
}

describe("jumboq", () => {
  it("to'g'ri javobni qabul qiladi", async () => {
    const { id, question } = await createChallenge("u1");
    expect(await consumeChallenge({ id, answer: solve(question), uid: "u1" })).toBe(true);
  });

  it("noto'g'ri javobni rad etadi va oyna OCHILMAYDI", async () => {
    const { id, question } = await createChallenge("u1");
    expect(await consumeChallenge({ id, answer: solve(question) + 1, uid: "u1" })).toBe(false);
    expect(await hasActiveGrant("u1")).toBe(false);
  });

  it("boshqa foydalanuvchining jumbog'i o'tmaydi", async () => {
    const { id, question } = await createChallenge("u1");
    expect(await consumeChallenge({ id, answer: solve(question), uid: "u2" })).toBe(false);
  });
});

describe("ishonch oynasi", () => {
  it("to'g'ri javobdan keyin ochiladi", async () => {
    const { id, question } = await createChallenge("u1");
    await consumeChallenge({ id, answer: solve(question), uid: "u1" });
    expect(await hasActiveGrant("u1")).toBe(true);
  });

  it("oyna ochiq bo'lsa jumboqsiz o'tkazadi", async () => {
    const { id, question } = await createChallenge("u1");
    await consumeChallenge({ id, answer: solve(question), uid: "u1" });
    // Client jumboq so'ramagan: id bo'sh, javob 0 - baribir o'tadi.
    expect(await consumeChallenge({ id: "", answer: 0, uid: "u1" })).toBe(true);
  });

  it("oyna FAQAT o'sha foydalanuvchiga tegishli", async () => {
    const { id, question } = await createChallenge("u1");
    await consumeChallenge({ id, answer: solve(question), uid: "u1" });
    expect(await hasActiveGrant("u2")).toBe(false);
    expect(await consumeChallenge({ id: "", answer: 0, uid: "u2" })).toBe(false);
  });

  it("muddati o'tgan oyna ishlamaydi", async () => {
    docs.set("adminChallengeGrants/u1", { until: Date.now() - 1000 });
    expect(await hasActiveGrant("u1")).toBe(false);
  });
});
