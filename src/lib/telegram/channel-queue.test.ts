import { describe, expect, it } from "vitest";
import { decideSlot, orderByVariety, type QueuedPost } from "./channel-queue";

/**
 * KANAL TEZLIGI - sof mantiq.
 *
 * Foydalanuvchi so'ragan qoida: "10 daqiqada 5 ta post; oshgani
 * keyingi oynada avtomatik chiqsin".
 */
const PACE = { maxPerWindow: 5, windowMinutes: 10 };
const NOW = 1_700_000_000_000;
const MINUTE = 60_000;

describe("kanal post tezligi", () => {
  it("oyna bo'sh bo'lsa darhol ruxsat beradi", () => {
    const decision = decideSlot([], PACE, NOW);
    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(4);
  });

  it("5 tadan keyin 6-chisini navbatga suradi", () => {
    // Oxirgi 10 daqiqada 5 ta post ketgan.
    const recent = [1, 2, 3, 4, 5].map((i) => NOW - i * MINUTE);
    const decision = decideSlot(recent, PACE, NOW);
    expect(decision.allowed).toBe(false);
    // Eng eskisi 5 daqiqa oldin ketgan -> 10 daqiqadan keyin, ya'ni
    // hozirdan 5 daqiqa keyin joy bo'shaydi.
    expect(Math.round((decision.nextAt - NOW) / MINUTE)).toBe(5);
  });

  it("oynadan chiqqan postlar sanalmaydi", () => {
    // Hammasi 10 daqiqadan oldin ketgan - oyna bo'sh hisoblanadi.
    const recent = [11, 12, 13, 14, 15].map((i) => NOW - i * MINUTE);
    expect(decideSlot(recent, PACE, NOW).allowed).toBe(true);
  });

  it("chegara 0 bo'lsa hamma post darhol ketadi", () => {
    const recent = Array.from({ length: 50 }, (_, i) => NOW - i * 1000);
    expect(decideSlot(recent, { maxPerWindow: 0, windowMinutes: 10 }, NOW).allowed).toBe(true);
  });

  it("boshqa oyna uzunligi bilan ham to'g'ri hisoblaydi", () => {
    const pace = { maxPerWindow: 2, windowMinutes: 30 };
    const recent = [NOW - 29 * MINUTE, NOW - 2 * MINUTE];
    const decision = decideSlot(recent, pace, NOW);
    expect(decision.allowed).toBe(false);
    expect(Math.round((decision.nextAt - NOW) / MINUTE)).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/*  XILMA-XIL TARTIB                                                   */
/* ------------------------------------------------------------------ */

function job(id: string, category?: string): QueuedPost {
  return { id, productId: id, productName: id, category, dueAt: 0, createdAt: 0 };
}

const names = (jobs: QueuedPost[]) => jobs.map((item) => item.id).join(",");

describe("orderByVariety", () => {
  it("ketma-ket bir xil kategoriyani bo'lib yuboradi", () => {
    const jobs = [
      job("cho1", "santexnika"),
      job("cho2", "santexnika"),
      job("cho3", "santexnika"),
      job("kran1", "kran"),
      job("radiator1", "isitish"),
    ];
    // Har qadamda oldingisidan BOSHQA kategoriyadagi eng eskisi olinadi.
    expect(names(orderByVariety(jobs, null))).toBe("cho1,kran1,cho2,radiator1,cho3");
  });

  it("oxirgi post kategoriyasini ham hisobga oladi", () => {
    const jobs = [job("cho1", "santexnika"), job("kran1", "kran")];
    // Kanalga endigina "santexnika" ketgan - navigatsiya krandan boshlanadi.
    expect(names(orderByVariety(jobs, "santexnika"))).toBe("kran1,cho1");
  });

  it("hammasi bir xil kategoriya bo'lsa tartib o'zgarmaydi (FIFO)", () => {
    const jobs = [job("a", "santexnika"), job("b", "santexnika"), job("c", "santexnika")];
    expect(names(orderByVariety(jobs, "santexnika"))).toBe("a,b,c");
  });

  it("hech bir yozuvni yo'qotmaydi va takrorlamaydi", () => {
    const jobs = [job("a", "x"), job("b"), job("c", "x"), job("d", "y"), job("e")];
    const ordered = orderByVariety(jobs, null);
    expect(ordered).toHaveLength(jobs.length);
    expect(new Set(ordered.map((item) => item.id)).size).toBe(jobs.length);
  });

  it("kategoriyasiz eski yozuvlar bilan ham yiqilmaydi", () => {
    const jobs = [job("a"), job("b"), job("c", "kran")];
    expect(names(orderByVariety(jobs, null))).toBe("c,a,b");
  });
});
