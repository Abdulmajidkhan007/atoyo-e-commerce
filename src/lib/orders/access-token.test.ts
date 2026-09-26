import { describe, expect, it } from "vitest";

import { newOrderAccessToken, verifyOrderAccessToken } from "./access-token";

describe("buyurtma kirish kaliti", () => {
  it("to'g'ri kalit qabul qilinadi, xesh kalitning o'zi emas", () => {
    const { token, hash } = newOrderAccessToken();
    expect(hash).not.toContain(token);
    expect(verifyOrderAccessToken(token, hash)).toBe(true);
  });

  it("boshqa kalit, bo'sh kalit va xeshsiz buyurtma rad etiladi", () => {
    const { hash } = newOrderAccessToken();
    expect(verifyOrderAccessToken(newOrderAccessToken().token, hash)).toBe(false);
    expect(verifyOrderAccessToken("", hash)).toBe(false);
    expect(verifyOrderAccessToken(null, hash)).toBe(false);
    expect(verifyOrderAccessToken("abc", null)).toBe(false);
  });

  it("har safar yangi kalit", () => {
    expect(newOrderAccessToken().token).not.toBe(newOrderAccessToken().token);
  });
});
