import { describe, expect, it } from "vitest";
import { loginUrl } from "./proxy";

/**
 * OCHIQ YO'NALTIRISH (open redirect) zaifligi: `?redirect=` ga tashqi
 * manzil yozib yuborilsa, kirgandan keyin mijoz begona saytga olib
 * chiqilardi (fishing uchun tayyor qurol). Shuning uchun faqat ichki
 * yo'lga ruxsat beriladi.
 */
describe("loginUrl", () => {
  it("ichki yo'lni saqlaydi", () => {
    const url = loginUrl("/admin/katalog", "https://atoyo.uz/admin/katalog", "login");
    expect(url.pathname).toBe("/kirish");
    expect(url.searchParams.get("redirect")).toBe("/admin/katalog");
    expect(url.searchParams.get("reason")).toBe("login");
  });

  it("tashqi manzilni RAD etadi", () => {
    for (const bad of ["https://saxta.uz", "//saxta.uz", "javascript:alert(1)"]) {
      const url = loginUrl(bad, "https://atoyo.uz/admin", "login");
      expect(url.searchParams.get("redirect")).toBe("/admin");
    }
  });
});
