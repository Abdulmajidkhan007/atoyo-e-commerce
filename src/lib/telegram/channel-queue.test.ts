import { describe, expect, it } from "vitest";
import { decideSlot } from "./channel-queue";

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
