import { describe, expect, it } from "vitest";
import { defaultFaqItems, faqJsonLd, localizeFaq, normalizeFaqItems } from "./faq";

describe("normalizeFaqItems", () => {
  it("bo'sh savol/javobni tashlaydi va yarim tarjimani olmaydi", () => {
    const items = normalizeFaqItems([
      { question: "  Savol?  ", answer: " Javob. ", questionRu: "Вопрос?" },
      { question: "", answer: "javobsiz savol emas" },
      { question: "Faqat savol", answer: "   " },
      null,
      "matn",
      { question: "Q2", answer: "A2", questionRu: "В2", answerRu: "О2" },
    ]);
    expect(items).toEqual([
      { question: "Savol?", answer: "Javob." },
      { question: "Q2", answer: "A2", questionRu: "В2", answerRu: "О2" },
    ]);
  });

  it("massiv bo'lmasa — bo'sh ro'yxat", () => {
    expect(normalizeFaqItems(undefined)).toEqual([]);
    expect(normalizeFaqItems({})).toEqual([]);
  });
});

describe("defaultFaqItems", () => {
  const delivery = { enabled: true, fee: 15000, freeFrom: 50000, city: "Qo'qon", freeRadiusKm: 15 };

  it("yetkazish javobi SOZLAMADAN yoziladi", () => {
    const items = defaultFaqItems({ delivery, transferEnabled: false, onlineEnabled: false });
    const answer = items.find((i) => i.question.includes("Yetkazib"))!.answer;
    expect(answer).toMatch(/50\s000/);
    expect(answer).toMatch(/15\s000/);
  });

  it("faqat YOQILGAN to'lov usullari aytiladi", () => {
    const pay = (t: boolean, o: boolean) =>
      defaultFaqItems({ delivery, transferEnabled: t, onlineEnabled: o }).find((i) => i.question.includes("to'lash"))!
        .answer;
    expect(pay(false, false)).not.toMatch(/kartaga|Payme/);
    expect(pay(true, false)).toContain("kartaga o'tkazma");
    expect(pay(false, true)).toContain("Payme");
  });

  it("o'rnatish o'chiq bo'lsa savol yo'q; kafolat va'dasi hech qachon yo'q", () => {
    const items = defaultFaqItems({
      delivery: { ...delivery, installEnabled: false },
      transferEnabled: true,
      onlineEnabled: true,
    });
    expect(items.some((i) => i.question.includes("o'rnatib"))).toBe(false);
    expect(JSON.stringify(items)).not.toMatch(/kafolat|qaytarish/i);
  });
});

describe("localizeFaq / faqJsonLd", () => {
  const items = [
    { question: "Q", answer: "A", questionRu: "В", answerRu: "О" },
    { question: "Q2", answer: "A2" },
  ];

  it("ruschasi bo'lmasa o'zbekchasi", () => {
    expect(localizeFaq(items, "ru")).toEqual([
      { question: "В", answer: "О" },
      { question: "Q2", answer: "A2" },
    ]);
    expect(localizeFaq(items, "uz")[0]).toEqual({ question: "Q", answer: "A" });
  });

  it("FAQPage sxemasi", () => {
    expect(faqJsonLd([{ question: "Q", answer: "A" }])).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: "Q", acceptedAnswer: { "@type": "Answer", text: "A" } }],
    });
  });
});
