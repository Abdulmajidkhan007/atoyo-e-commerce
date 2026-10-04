import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Admin chek route'i — sarlavhalar (AUDIT-ISHLARI 14-band): fayl mijozdan
 * keladi, shuning uchun CSP `sandbox`, `no-store`, `nosniff`; PDF — yuklab
 * olinadi; yo'l `receipts/<id>/` dan tashqariga chiqmaydi.
 */

let allowed = true;
let orderData: Record<string, unknown> | null = null;
const readMock = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: () => ({ get: async () => ({ exists: orderData !== null, data: () => orderData }) }),
    }),
  }),
}));
vi.mock("@/lib/firebase/session", () => ({ requirePermission: async () => (allowed ? { uid: "a" } : null) }));
vi.mock("@/lib/firebase/admin-storage", () => ({ readPrivateFile: (p: string) => readMock(p) }));

import { GET } from "./route";

const call = () =>
  GET(new Request("http://localhost/x"), { params: Promise.resolve({ id: "abcdef123456" }) });

beforeEach(() => {
  allowed = true;
  orderData = null;
  readMock.mockReset();
  readMock.mockResolvedValue(Buffer.from("bytes"));
});

describe("GET /api/admin/orders/[id]/receipt", () => {
  it("ruxsatsiz → 403", async () => {
    allowed = false;
    expect((await call()).status).toBe(403);
    expect(readMock).not.toHaveBeenCalled();
  });

  it("chek yo'q → 404", async () => {
    orderData = {};
    expect((await call()).status).toBe(404);
  });

  it("boshqa buyurtma yo'li → 404, fayl o'qilmaydi", async () => {
    orderData = { receipt: { path: "receipts/other/1.png", contentType: "image/png" } };
    expect((await call()).status).toBe(404);
    expect(readMock).not.toHaveBeenCalled();
  });

  it("rasm: inline + sandbox CSP + no-store + nosniff", async () => {
    orderData = { receipt: { path: "receipts/abcdef123456/1.png", contentType: "image/png" } };
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Content-Security-Policy")).toMatch(/^sandbox;/);
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Content-Disposition")).toMatch(/^inline;/);
  });

  it("PDF: attachment", async () => {
    orderData = { receipt: { path: "receipts/abcdef123456/1.pdf", contentType: "application/pdf" } };
    const res = await call();
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment; filename="chek-abcdef12\.pdf"/);
  });

  it("Storage o'qilmasa → 500", async () => {
    orderData = { receipt: { path: "receipts/abcdef123456/1.png", contentType: "image/png" } };
    readMock.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await call()).status).toBe(500);
  });
});
