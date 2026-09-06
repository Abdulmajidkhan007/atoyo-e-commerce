import { describe, expect, it } from "vitest";
import { uzbekHint } from "./images";

/**
 * Gemini xatosi INGLIZCHA keladi va do'kon xodimi undan nima qilishni
 * bilmaydi. Har bir tanish sabab uchun o'zbekcha aniq qadam beriladi;
 * naqsh mos kelmasa xodim faqat inglizcha matnni ko'radi va qotib
 * qoladi - shuning uchun eng ko'p uchraydigan matnlar test bilan
 * qulflanadi.
 */
describe("uzbekHint", () => {
  it("to'lov blokini (dunning) taniydi", () => {
    const hint = uzbekHint(
      "Lightning dunning decision is deny for project: projects/832499302134"
    );
    expect(hint).toContain("TO'LOV");
    expect(hint).toContain("billing");
  });

  it("kredit tugaganini taniydi", () => {
    expect(uzbekHint("You exceeded your current prepayment credits")).toContain("kredit");
  });

  it("noto'g'ri kalitni taniydi", () => {
    expect(uzbekHint("API key not valid. Please pass a valid API key.")).toContain("Kalit");
  });

  it("notanish xato uchun null qaytaradi", () => {
    expect(uzbekHint("Something completely different happened")).toBeNull();
  });
});
