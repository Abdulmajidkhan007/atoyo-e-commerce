import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { accumulateUserStats, USER_STATS_FIELDS, type UserOrderStats } from "./user-stats";

/**
 * Bir martalik to'ldirish (`/api/admin/maintenance/user-stats`) increment
 * mantiqi bilan BIR XIL natija berishi shart - aks holda keyingi
 * buyurtmalar noto'g'ri bazadan sanaladi.
 */
function collect(orders: Parameters<typeof accumulateUserStats>[1][]) {
  return orders.reduce((acc, order) => accumulateUserStats(acc, order), new Map<string, UserOrderStats>());
}

describe("accumulateUserStats", () => {
  it("soni, summasi va oxirgi sanasini yig'adi", () => {
    const stats = collect([
      { userId: "u1", totalAmount: 1000, createdAt: 10, status: "completed" },
      { userId: "u1", totalAmount: 2500, createdAt: 30, status: "pending" },
      { userId: "u2", totalAmount: 700, createdAt: 20, status: "approved" },
    ]);
    expect(stats.get("u1")).toEqual({ ordersCount: 2, totalSpent: 3500, lastOrderAt: 30 });
    expect(stats.get("u2")).toEqual({ ordersCount: 1, totalSpent: 700, lastOrderAt: 20 });
  });

  it("bekor qilingani (zaxira qaytgan) soni/summasiga kirmaydi, lastOrderAt ga kiradi", () => {
    const stats = collect([
      { userId: "u1", totalAmount: 1000, createdAt: 10, status: "completed" },
      { userId: "u1", totalAmount: 9000, createdAt: 50, status: "cancelled", stockReturned: true },
    ]);
    expect(stats.get("u1")).toEqual({ ordersCount: 1, totalSpent: 1000, lastOrderAt: 50 });
  });

  it("qaytarilgan summa ayiriladi", () => {
    const stats = collect([{ userId: "u1", totalAmount: 5000, refundAmount: 2000, createdAt: 1 }]);
    expect(stats.get("u1")!.totalSpent).toBe(3000);
  });

  it("mehmon buyurtmasi hech kimga yozilmaydi", () => {
    const stats = collect([
      { userId: null, totalAmount: 1000, createdAt: 1 },
      { totalAmount: 1000, createdAt: 2 },
    ]);
    expect(stats.size).toBe(0);
  });

  it("yaratilganda hisobga kirmagan (userStatsCounted=false) — to'ldirishda ham kirmaydi", () => {
    const stats = collect([
      { userId: "u1", totalAmount: 1000, createdAt: 1, userStatsCounted: false },
      { userId: "u1", totalAmount: 500, createdAt: 2 },
    ]);
    expect(stats.get("u1")).toMatchObject({ ordersCount: 1, totalSpent: 500 });
  });
});

describe("firestore.rules", () => {
  it("mijoz users hujjatidagi statistika maydonlarini o'zi yoza olmaydi", () => {
    const rules = readFileSync("firestore.rules", "utf8");
    const block = rules.slice(rules.indexOf("match /users/{userId} {"), rules.indexOf("match /users/{userId}/cards"));
    const create = block.slice(block.indexOf("allow create"), block.indexOf("allow update"));
    const update = block.slice(block.indexOf("allow update"));
    for (const field of USER_STATS_FIELDS) {
      expect(create).toContain(`'${field}'`);
      expect(update).toContain(`'${field}'`);
    }
    expect(update).toContain("affectedKeys()");
  });
});
