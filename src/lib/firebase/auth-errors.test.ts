import { describe, expect, it } from "vitest";
import { authErrorKind } from "./auth-errors";

/**
 * Yangi domenga ko'chganda kirish ishlamay qolgan edi va ekranda
 * faqat "Kirishda xatolik" chiqardi — sabab ko'rinmagani uchun
 * muammoni topish uzoq davom etdi. Shu ajratish qulflanadi.
 */
describe("authErrorKind", () => {
  it("noto'g'ri parolni taniydi", () => {
    expect(authErrorKind({ code: "auth/invalid-credential" })).toBe("wrongCredentials");
    expect(authErrorKind({ code: "auth/wrong-password" })).toBe("wrongCredentials");
    expect(authErrorKind({ code: "auth/user-not-found" })).toBe("wrongCredentials");
  });

  it("domen/kalit cheklovini taniydi", () => {
    expect(authErrorKind({ code: "auth/unauthorized-domain" })).toBe("domain");
    const referer = Object.assign(new Error("Requests-from-referer-https://atoyo.uz-are-blocked."), {
      code: "auth/internal-error",
    });
    expect(authErrorKind(referer)).toBe("domain");
  });

  it("tarmoq va urinishlar chegarasini ajratadi", () => {
    expect(authErrorKind({ code: "auth/network-request-failed" })).toBe("network");
    expect(authErrorKind({ code: "auth/too-many-requests" })).toBe("tooMany");
  });

  it("ro'yxatdan o'tish xatolarini ajratadi", () => {
    expect(authErrorKind({ code: "auth/email-already-in-use" })).toBe("emailInUse");
    expect(authErrorKind({ code: "auth/weak-password" })).toBe("weakPassword");
  });

  it("notanish xato generic bo'ladi", () => {
    expect(authErrorKind(new Error("nimadir"))).toBe("generic");
    expect(authErrorKind(null)).toBe("generic");
  });
});
