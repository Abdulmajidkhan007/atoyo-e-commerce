import { describe, expect, it } from "vitest";
import { buildReviewLine } from "./review-text";

/**
 * Mijoz sharhi HTML rejimidagi Telegram xabariga XOM holda tushsa,
 * yopilmagan <b> butun javobni yiqitadi, <a href> esa fishing
 * havolasiga aylanadi. Shuning uchun muallif ismi va matn har doim
 * escape qilinishi kerak.
 */
describe("buildReviewLine", () => {
  it("oddiy sharhni o'zgartirmaydi", () => {
    const out = buildReviewLine({ rating: 5, authorName: "Aziz", comment: "Yaxshi mahsulot" });
    expect(out).toBe("⭐️⭐️⭐️⭐️⭐️\n<b>Aziz</b>: Yaxshi mahsulot");
  });

  it("yopilmagan <b> tegini escape qiladi", () => {
    const out = buildReviewLine({ rating: 1, authorName: "Mijoz", comment: "<b>x" });
    expect(out).toContain("&lt;b&gt;x");
    expect(out).not.toContain("<b>x");
  });

  it("fishing havolasini (<a href=...>) escape qiladi", () => {
    const out = buildReviewLine({
      rating: 3,
      authorName: "Mijoz",
      comment: '<a href="https://evil.example">bosing</a>',
    });
    expect(out).toContain('&lt;a href="https://evil.example"&gt;bosing&lt;/a&gt;');
    expect(out).not.toContain("<a href=");
  });

  it("muallif ismidagi tegni ham escape qiladi", () => {
    const out = buildReviewLine({ rating: 4, authorName: "<script>alert(1)</script>", comment: "ok" });
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });
});
