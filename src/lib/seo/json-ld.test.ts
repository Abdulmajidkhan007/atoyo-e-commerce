import { describe, expect, it } from "vitest";
import { organizationJsonLd } from "./json-ld";

/**
 * DO'KON SXEMASI (Store).
 *
 * Google mahalliy qidiruvda ("santexnika Qo'qon") do'konni manzil va
 * telefon orqali taniydi. Ular admin sozlamasidan keladi — sozlama
 * o'qilmasa sxema BARIBIR chiqishi kerak (manzilsiz), aks holda bosh
 * sahifa umuman sxemasiz qoladi.
 */
function store(data: object): Record<string, unknown> {
  const graph = (data as { "@graph": Record<string, unknown>[] })["@graph"];
  return graph.find((item) => item["@type"] === "Store")!;
}

describe("organizationJsonLd", () => {
  it("manzil, telefon va ijtimoiy havolalarni qo'shadi", () => {
    const node = store(
      organizationJsonLd({
        phone: "+998 99 999 02 22",
        email: "info@atoyo.uz",
        address: "Qo'qon, Navbahor ko'chasi 45p",
        socialUrls: ["https://t.me/atoyo_uz", "https://instagram.com/atoyo"],
      })
    );

    expect(node.telephone).toBe("+998 99 999 02 22");
    expect(node.email).toBe("info@atoyo.uz");
    expect(node.sameAs).toHaveLength(2);
    expect(node.address).toMatchObject({
      "@type": "PostalAddress",
      streetAddress: "Qo'qon, Navbahor ko'chasi 45p",
      addressLocality: "Qo'qon",
      addressCountry: "UZ",
    });
  });

  it("sozlama bo'lmasa ham sxema chiqadi", () => {
    const node = store(organizationJsonLd());
    expect(node["@type"]).toBe("Store");
    expect(node.address).toBeUndefined();
    expect(node.telephone).toBeUndefined();
    expect(node.sameAs).toBeUndefined();
  });

  it("bo'sh qiymatlar sxemaga tushmaydi", () => {
    const node = store(organizationJsonLd({ phone: "  ", address: "", socialUrls: [] }));
    expect(node.telephone).toBeUndefined();
    expect(node.address).toBeUndefined();
    expect(node.sameAs).toBeUndefined();
  });
});
