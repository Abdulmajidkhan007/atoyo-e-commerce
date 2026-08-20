import { describe, expect, it } from "vitest";
import { truncateHtml } from "./html-truncate";

/**
 * Kanal posti kesilganda Telegram butun postni rad etgan edi:
 * `Can't find end tag corresponding to start tag "b"`. Sabab —
 * HTML matn oddiy `slice()` bilan teg o'rtasidan kesilgani.
 */
describe("truncateHtml", () => {
  it("chegaradan qisqa matnga tegmaydi", () => {
    expect(truncateHtml("<b>Kran</b>", 100)).toBe("<b>Kran</b>");
  });

  it("ochiq qolgan tegni o'zi yopadi", () => {
    const out = truncateHtml("<b>Oyna hammom uchun juda uzun nom</b>", 20);
    expect(out.endsWith("</b>")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(20);
    // Ochilgan va yopilgan teglar soni teng.
    expect((out.match(/<b>/g) ?? []).length).toBe((out.match(/<\/b>/g) ?? []).length);
  });

  it("teg o'rtasidan kesmaydi", () => {
    const out = truncateHtml("Narx: <b>91 400 so'm</b> · kod: <code>SJ-03</code>", 18);
    expect(out).not.toMatch(/<[a-z]*$/i);
    expect(out.length).toBeLessThanOrEqual(18);
  });

  it("HTML entity ichidan kesmaydi", () => {
    const out = truncateHtml("AAAA &amp; BBBB", 10);
    expect(out).not.toMatch(/&[a-z]*$/i);
  });

  it("ichma-ich teglarni to'g'ri tartibda yopadi", () => {
    const out = truncateHtml("<b><i>juda uzun matn shu yerda</i></b>", 24);
    expect(out.endsWith("</i></b>")).toBe(true);
  });

  it("natija chegaradan oshmaydi", () => {
    const html = "<b>Nom</b> — <i>tavsif</i> · <code>KOD-1</code> qo'shimcha matn";
    for (let limit = 5; limit <= 60; limit += 1) {
      expect(truncateHtml(html, limit).length).toBeLessThanOrEqual(Math.max(limit, 0));
    }
  });
});
