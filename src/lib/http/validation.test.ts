import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validationMessage } from "./validation";

/**
 * Sabab: mahsulotni saqlashda admin faqat "Ma'lumotlar noto'g'ri."
 * degan xabarni ko'rardi. Formada 30 dan ortiq maydon bor - qaysi
 * biri aybdorligini topib bo'lmasdi.
 */

const schema = z.object({
  name: z.string().min(1).max(200),
  keywords: z.array(z.string().max(60)).max(10),
  price: z.number().nonnegative(),
  images: z.array(z.string().url()).max(10),
});

function messageFor(input: unknown): string {
  const parsed = schema.safeParse(input);
  if (parsed.success) throw new Error("xato kutilgandi");
  return validationMessage(parsed.error);
}

const VALID = { name: "Smesitel", keywords: ["a"], price: 1000, images: [] };

describe("validationMessage", () => {
  it("ro'yxat chegarasini odam tilida aytadi", () => {
    const message = messageFor({
      ...VALID,
      keywords: Array.from({ length: 11 }, (_, index) => `k${index}`),
    });
    expect(message).toContain("Maxsus kalit so'zlar");
    expect(message).toContain("10 tadan ko'p bo'lmasin");
  });

  it("bo'sh majburiy maydonni ko'rsatadi", () => {
    expect(messageFor({ ...VALID, name: "" })).toContain("Nomi — bo'sh qoldirilmaydi");
  });

  it("to'ldirilmagan maydonni ko'rsatadi", () => {
    const message = messageFor({ keywords: [], images: [] });
    expect(message).toContain("Nomi");
    expect(message).toContain("to'ldirilmagan");
  });

  it("uzun matnni belgilar soni bilan aytadi", () => {
    expect(messageFor({ ...VALID, name: "x".repeat(201) })).toContain("200 belgidan uzun bo'lmasin");
  });

  it("ro'yxat ichidagi nechanchi element ekanini aytadi", () => {
    const message = messageFor({ ...VALID, images: ["manzil-emas"] });
    expect(message).toContain("Rasmlar (1-qator)");
  });

  it("eng ko'pi bilan uchta sabab yoziladi", () => {
    const message = messageFor({ name: "", keywords: [123], price: "x", images: [1] });
    expect(message.split(";").length).toBeLessThanOrEqual(3);
  });
});
