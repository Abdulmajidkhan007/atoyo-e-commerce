import { describe, expect, it, vi } from "vitest";

/**
 * BUYURTMA SAHIFASIGA KIRISH — kim kira oladi (IDOR himoyasi).
 * Sessiya moduli soxtalanadi: "tizimga kirgan" foydalanuvchi uid si
 * testdan boshqariladi.
 */
let sessionUid: string | null = null;
vi.mock("@/lib/firebase/session", () => ({
  getAppUserFromRequest: async () => (sessionUid ? { uid: sessionUid } : null),
}));

const { canAccessOrder } = await import("./order-access");
const { newOrderAccessToken } = await import("./access-token");

const request = new Request("https://atoyo.uz/api/orders/x/receipt");

describe("canAccessOrder", () => {
  it("to'g'ri kalit bilan mehmon kiradi", async () => {
    sessionUid = null;
    const { token, hash } = newOrderAccessToken();
    expect(await canAccessOrder({ userId: null, accessTokenHash: hash }, token, request)).toBe(true);
  });

  it("noto'g'ri kalit bilan mehmon KIRA OLMAYDI", async () => {
    sessionUid = null;
    const { hash } = newOrderAccessToken();
    expect(await canAccessOrder({ userId: null, accessTokenHash: hash }, "boshqa", request)).toBe(false);
    expect(await canAccessOrder({ userId: null, accessTokenHash: hash }, "", request)).toBe(false);
  });

  it("egasi kalitsiz kiradi, BOSHQA foydalanuvchi — yo'q", async () => {
    sessionUid = "egasi";
    expect(await canAccessOrder({ userId: "egasi", accessTokenHash: null }, "", request)).toBe(true);
    sessionUid = "begona";
    expect(await canAccessOrder({ userId: "egasi", accessTokenHash: null }, "", request)).toBe(false);
  });

  it("mehmon buyurtmasiga (userId null) hech qanday sessiya bilan kalitsiz kirilmaydi", async () => {
    sessionUid = "kimdir";
    const { hash } = newOrderAccessToken();
    expect(await canAccessOrder({ userId: null, accessTokenHash: hash }, "", request)).toBe(false);
  });
});
