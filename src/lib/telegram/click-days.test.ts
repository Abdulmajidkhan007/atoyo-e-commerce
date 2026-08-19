import { describe, expect, it } from "vitest";
import { dayKey, staleDayKeys, sumRecentDays } from "./click-days";

/**
 * Kanal posti bosilishlari kun bo'yicha bitta hujjatda saqlanadi.
 * "7 kunda nechta" hisobi shu kalitlar ustida yuritilgani uchun
 * sana arifmetikasi alohida tekshiriladi.
 */
describe("click-days", () => {
  const now = Date.parse("2026-08-19T10:00:00Z");
  const day = 86_400_000;

  it("kunlik kalit YYYY-MM-DD shaklida", () => {
    expect(dayKey(now)).toBe("2026-08-19");
  });

  it("oxirgi 7 kunni yig'adi, undan eskisini olmaydi", () => {
    const days = {
      "2026-08-19": 3, // bugun
      "2026-08-18": 2,
      "2026-08-13": 5, // 6 kun oldin - kiradi
      "2026-08-12": 9, // 7 kun oldin - KIRMAYDI
    };
    expect(sumRecentDays(days, 1, now)).toBe(3);
    expect(sumRecentDays(days, 7, now)).toBe(10);
  });

  it("hisob yo'q bo'lsa 0", () => {
    expect(sumRecentDays(undefined, 7, now)).toBe(0);
    expect(sumRecentDays({}, 7, now)).toBe(0);
  });

  it("chegaradan oshgan eng eski kalitlarni ajratadi", () => {
    const days: Record<string, number> = {};
    for (let i = 0; i < 5; i += 1) days[dayKey(now - i * day)] = 1;

    expect(staleDayKeys(days, 5)).toEqual([]);
    expect(staleDayKeys(days, 3)).toEqual(["2026-08-15", "2026-08-16"]);
  });
});
