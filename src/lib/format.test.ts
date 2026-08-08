import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatNumber, formatSom } from "./format";

const NBSP = "\u00A0";

describe("formatNumber", () => {
  it("uch xonadan guruhlaydi", () => {
    expect(formatNumber(1234567)).toBe(`1${NBSP}234${NBSP}567`);
    expect(formatNumber(1000)).toBe(`1${NBSP}000`);
  });

  it("mingdan kichik sonni tegmaydi", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
  });

  it("kasrni yaxlitlaydi", () => {
    expect(formatNumber(115_497.6)).toBe(`115${NBSP}498`);
  });

  it("manfiy sonni ham to'g'ri chizadi", () => {
    expect(formatNumber(-12_500)).toBe(`-12${NBSP}500`);
  });

  it("yaroqsiz qiymatda yiqilmaydi", () => {
    expect(formatNumber(Number.NaN)).toBe("0");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("0");
  });
});

describe("formatSom", () => {
  it("ajratgich uzilmas bo'sh joy bo'ladi (qator bo'linmasin)", () => {
    expect(formatSom(115_500)).toBe(`115${NBSP}500 so'm`);
  });
});

describe("formatDate / formatDateTime", () => {
  // 2026-02-08T23:30:00Z → Toshkentda 09.02.2026 04:30 (UTC+5).
  const ms = Date.UTC(2026, 1, 8, 23, 30);

  it("Toshkent vaqtida (UTC+5) ko'rsatadi, serverning UTC'sida emas", () => {
    expect(formatDate(ms)).toBe("09.02.2026");
    expect(formatDateTime(ms)).toBe("09.02.2026 04:30");
  });

  it("kun va oyni ikki xonaga to'ldiradi", () => {
    expect(formatDate(Date.UTC(2026, 0, 3, 6, 0))).toBe("03.01.2026");
  });

  it("sana yo'q bo'lsa chiziqcha qaytaradi", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDateTime(0)).toBe("—");
  });
});
