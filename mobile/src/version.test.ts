import { describe, expect, it } from "vitest";
import { isNewer } from "./version";

/**
 * Yangilanish oynasi shu solishtirishga tayanadi: xato bo'lsa yo
 * eslatma umuman chiqmaydi, yo har ochilganda bezovta qiladi.
 */
describe("isNewer", () => {
  it("kattaroq versiyani topadi", () => {
    expect(isNewer("1.1", "1.0")).toBe(true);
    expect(isNewer("1.0.1", "1.0")).toBe(true);
    expect(isNewer("2.0", "1.9.9")).toBe(true);
  });

  it("bir xil yoki eski bo'lsa - yo'q", () => {
    expect(isNewer("1.0", "1.0")).toBe(false);
    expect(isNewer("1.0", "1.1")).toBe(false);
    expect(isNewer("0.9", "1.0")).toBe(false);
  });

  it("'v' prefiksi va yetishmagan qismlarga bardosh beradi", () => {
    expect(isNewer("v1.2", "1.1")).toBe(true);
    expect(isNewer("1", "1.0.0")).toBe(false);
  });
});
