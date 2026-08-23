import { describe, expect, it } from "vitest";
import { getClientIp } from "./rate-limit";

function requestWithXff(value: string | null): Request {
  const headers = new Headers();
  if (value !== null) headers.set("x-forwarded-for", value);
  return new Request("https://example.com/api/test", { headers });
}

describe("getClientIp", () => {
  it("bitta IP bo'lsa - o'sha qiymatni qaytaradi", () => {
    expect(getClientIp(requestWithXff("203.0.113.7"))).toBe("203.0.113.7");
  });

  it("ikkita IP bo'lsa (haqiqiy mijoz + Google LB) - birinchisini qaytaradi", () => {
    // Google Front End: <haqiqiy mijoz>, <LB IP>
    expect(getClientIp(requestWithXff("203.0.113.7, 130.211.1.1"))).toBe("203.0.113.7");
  });

  it("mijoz birinchi qiymatni soxtalashtirsa ham - oxirgidan oldingi (haqiqiy) qiymat olinadi", () => {
    expect(getClientIp(requestWithXff("1.2.3.4, 203.0.113.7, 130.211.1.1"))).toBe("203.0.113.7");
    // Oxirgi qiymat (Google'ning o'z LB IP si) HECH QACHON olinmasligi kerak -
    // aks holda hamma so'rov shu bitta "IP" ga tushib qoladi.
    expect(getClientIp(requestWithXff("1.2.3.4, 203.0.113.7, 130.211.1.1"))).not.toBe("130.211.1.1");
  });

  it("bo'sh header bo'lsa - 'unknown' qaytaradi", () => {
    expect(getClientIp(requestWithXff(null))).toBe("unknown");
    expect(getClientIp(requestWithXff(""))).toBe("unknown");
  });

  it("IP shaklida bo'lmagan qiymatni rad etadi", () => {
    expect(getClientIp(requestWithXff("shu-yerda-skript-bor"))).toBe("unknown");
  });

  it("IPv6 manzillarni ham to'g'ri o'qiydi", () => {
    expect(getClientIp(requestWithXff("2001:db8::1, ::ffff:130.211.1.1"))).toBe("2001:db8::1");
  });

  it("bo'sh bo'g'inlarni (ortiqcha vergul) e'tiborsiz qoldiradi", () => {
    expect(getClientIp(requestWithXff("203.0.113.7,, 130.211.1.1"))).toBe("203.0.113.7");
  });
});
