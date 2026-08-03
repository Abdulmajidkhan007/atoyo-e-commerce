import { describe, expect, it } from "vitest";
import { allNames, localizedDescription, localizedName } from "./i18n";

const product = {
  name: "Sharli kran 1/2",
  nameRu: "Шаровой кран 1/2",
  nameEn: "",
  description: "Latun sharli kran.",
  descriptionRu: "Латунный шаровой кран.",
  descriptionEn: undefined,
};

describe("mahsulot tarjimalari", () => {
  it("tanlangan tildagi nomni beradi", () => {
    expect(localizedName(product, "uz")).toBe("Sharli kran 1/2");
    expect(localizedName(product, "ru")).toBe("Шаровой кран 1/2");
  });

  it("tarjima bo'sh bo'lsa o'zbekchasiga qaytadi", () => {
    // Inglizchasi bo'sh satr, tavsifi esa umuman yo'q.
    expect(localizedName(product, "en")).toBe("Sharli kran 1/2");
    expect(localizedDescription(product, "en")).toBe("Latun sharli kran.");
  });

  it("tavsifni ham tilga qarab tanlaydi", () => {
    expect(localizedDescription(product, "ru")).toBe("Латунный шаровой кран.");
  });

  it("qidiruv uchun barcha nomlarni birlashtiradi", () => {
    expect(allNames(product)).toBe("Sharli kran 1/2 Шаровой кран 1/2");
  });
});
