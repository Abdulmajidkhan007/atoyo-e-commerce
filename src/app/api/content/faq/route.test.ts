import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/api/content/faq` — ilova uchun ochiq Savol-javob.
 * Qulflangan: til tanlovi (ruscha bo'lmasa o'zbekcha), javobda faqat
 * `question`/`answer` (ruscha maydonlar va boshqa ichki narsa YO'Q),
 * CDN keshi.
 */

const getPublicFaqMock = vi.fn();
vi.mock("@/lib/content/faq-server", () => ({ getPublicFaq: () => getPublicFaqMock() }));

import { GET } from "./route";

const ITEMS = [
  { question: "Savol 1", answer: "Javob 1", questionRu: "Вопрос 1", answerRu: "Ответ 1" },
  { question: "Savol 2", answer: "Javob 2" },
];

const call = (qs: string) => GET(new Request(`https://atoyo.uz/api/content/faq${qs}`));

describe("GET /api/content/faq", () => {
  beforeEach(() => getPublicFaqMock.mockReset().mockResolvedValue(ITEMS));

  it("o'zbekcha standart, faqat question/answer", async () => {
    const body = await (await call("")).json();
    expect(body).toEqual({
      items: [
        { question: "Savol 1", answer: "Javob 1" },
        { question: "Savol 2", answer: "Javob 2" },
      ],
    });
  });

  it("locale=ru: tarjimasi bor savol ruscha, yo'g'i o'zbekcha", async () => {
    const body = await (await call("?locale=ru")).json();
    expect(body.items).toEqual([
      { question: "Вопрос 1", answer: "Ответ 1" },
      { question: "Savol 2", answer: "Javob 2" },
    ]);
  });

  it("notanish til o'zbekchaga tushadi; javob CDN'da keshlanadi", async () => {
    const res = await call("?locale=en");
    expect((await res.json()).items[0].question).toBe("Savol 1");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
  });
});
