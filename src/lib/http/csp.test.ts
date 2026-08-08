import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./csp";

/**
 * CSP TESTI.
 *
 * Sabab: CSP birinchi marta qo'shilganda `media-src` yozilmay qolgan
 * va u `default-src 'self'` ga tushgan — natijada mahsulot VIDEOSI
 * saytda jimgina yuklanmay qo'ygan (pleyer chizilgan, fayl yo'q).
 * Bunday xato brauzer konsolisiz sezilmaydi, shuning uchun mijozga
 * ko'rinadigan har bir tur shu yerda qulflanadi.
 */

function directive(name: string, policy = contentSecurityPolicy(false)): string[] {
  const part = policy
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${name} `));
  if (!part) throw new Error(`CSP'da "${name}" yo'q`);
  return part.split(/\s+/).slice(1);
}

describe("contentSecurityPolicy", () => {
  it("mahsulot RASMI va VIDEOSI tashqi manbadan yuklana oladi", () => {
    // Ikkalasi ham Firebase Storage'da turadi.
    expect(directive("img-src")).toContain("https:");
    expect(directive("media-src")).toContain("https:");
  });

  it("mijozga ko'rinadigan har bir tur ochiq yozilgan", () => {
    // Yozilmagan tur `default-src` ga tushadi va jimgina bloklanadi.
    for (const name of [
      "default-src",
      "script-src",
      "style-src",
      "img-src",
      "media-src",
      "font-src",
      "connect-src",
      "frame-src",
      "worker-src",
    ]) {
      expect(() => directive(name)).not.toThrow();
    }
  });

  it("Firebase (Firestore, Storage, Auth) bilan ulanishga ruxsat bor", () => {
    const connect = directive("connect-src");
    expect(connect).toContain("https://*.googleapis.com");
    expect(connect).toContain("https://*.gstatic.com");
  });

  it("Telegram login vidjeti ishlaydi", () => {
    expect(directive("script-src")).toContain("https://telegram.org");
    expect(directive("frame-src")).toContain("https://oauth.telegram.org");
  });

  it("sayt boshqa saytga iframe qilinmaydi", () => {
    expect(directive("frame-ancestors")).toEqual(["'none'"]);
    expect(directive("object-src")).toEqual(["'none'"]);
    expect(directive("base-uri")).toEqual(["'self'"]);
  });

  it("`unsafe-eval` faqat ishlab chiqishda beriladi", () => {
    expect(directive("script-src", contentSecurityPolicy(true))).toContain("'unsafe-eval'");
    expect(directive("script-src", contentSecurityPolicy(false))).not.toContain("'unsafe-eval'");
  });
});
