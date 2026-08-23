import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADMIN_PERMISSIONS,
  OWNER_EMAIL,
  allPermissions,
  hasPermission,
  isOwner,
  isStaff,
} from "./permissions";

describe("isOwner", () => {
  it("OWNER_EMAIL bilan kirgan foydalanuvchi owner", () => {
    expect(isOwner({ email: OWNER_EMAIL.toUpperCase() })).toBe(true);
  });

  it("role: owner bo'lsa ham owner", () => {
    expect(isOwner({ role: "owner", email: "boshqa@example.com" })).toBe(true);
  });

  it("oddiy admin owner emas", () => {
    expect(isOwner({ role: "admin", email: "admin@example.com" })).toBe(false);
  });

  it("null/undefined owner emas", () => {
    expect(isOwner(null)).toBe(false);
    expect(isOwner(undefined)).toBe(false);
  });
});

describe("isStaff", () => {
  it("owner va admin staff, oddiy user emas", () => {
    expect(isStaff({ email: OWNER_EMAIL })).toBe(true);
    expect(isStaff({ role: "admin" })).toBe(true);
    expect(isStaff({ role: "user" })).toBe(false);
    expect(isStaff(null)).toBe(false);
  });
});

describe("hasPermission", () => {
  it("owner uchun BARCHA huquqlar true (permissions maydoni bo'lmasa ham)", () => {
    const owner = { email: OWNER_EMAIL };
    expect(hasPermission(owner, "roles")).toBe(true);
    expect(hasPermission(owner, "settings")).toBe(true);
  });

  it("admin uchun faqat berilgan huquq true", () => {
    const admin = { role: "admin", permissions: { products: true, orders: false } };
    expect(hasPermission(admin, "products")).toBe(true);
    expect(hasPermission(admin, "orders")).toBe(false);
    expect(hasPermission(admin, "settings")).toBe(false);
  });

  it("admin uchun permissions belgilanmagan bo'lsa DEFAULT_ADMIN_PERMISSIONS ishlatiladi", () => {
    const admin = { role: "admin" };
    for (const key of Object.keys(DEFAULT_ADMIN_PERMISSIONS) as (keyof typeof DEFAULT_ADMIN_PERMISSIONS)[]) {
      expect(hasPermission(admin, key)).toBe(DEFAULT_ADMIN_PERMISSIONS[key] === true);
    }
  });

  it("oddiy user (role !== admin) hech qanday huquqqa ega emas", () => {
    expect(hasPermission({ role: "user" }, "products")).toBe(false);
  });

  it("null/undefined foydalanuvchi hech narsaga ega emas", () => {
    expect(hasPermission(null, "products")).toBe(false);
    expect(hasPermission(undefined, "orders")).toBe(false);
  });
});

describe("allPermissions", () => {
  it("hamma huquqni true qilib qaytaradi", () => {
    const all = allPermissions();
    for (const value of Object.values(all)) {
      expect(value).toBe(true);
    }
    const admin = { role: "admin", permissions: all };
    expect(hasPermission(admin, "roles")).toBe(true);
  });
});
