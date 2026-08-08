import { describe, expect, it } from "vitest";
import { gunzipSync } from "node:zlib";
import { lottieFromScene, pathToBeziers, svgFromScene, tgsFromScene } from "./animate";
import { buildAnimationScene } from "./animations";
import { STICKER_ANIMATIONS } from "@/types/sticker";

/** Birinchi bo'lak - testlarda har safar `undefined` tekshirmaslik uchun. */
function firstSub(d: string) {
  const sub = pathToBeziers(d)[0];
  if (!sub) throw new Error("bo'lak topilmadi");
  return sub;
}

/** Cho'qqi - indeks bo'yicha, `undefined` bo'lsa xato. */
function vertexAt(sub: ReturnType<typeof firstSub>, index: number) {
  const vertex = sub.vertices[index];
  if (!vertex) throw new Error(`cho'qqi yo'q: ${index}`);
  return vertex;
}

describe("pathToBeziers", () => {
  it("to'g'ri chiziqlarda tangens qo'ymaydi", () => {
    const sub = firstSub("M 0 0 L 10 0 L 10 10");
    expect(sub.closed).toBe(false);
    expect(sub.vertices.map((vertex) => vertex.v)).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    expect(sub.vertices.every((vertex) => vertex.i[0] === 0 && vertex.o[0] === 0)).toBe(true);
  });

  it("kubik egrida tangenslar cho'qqiga NISBATAN saqlanadi", () => {
    const sub = firstSub("M 0 0 C 2 4 8 4 10 0");
    expect(sub.vertices).toHaveLength(2);
    // Chiquvchi tangens: (2,4) - (0,0)
    expect(vertexAt(sub, 0).o).toEqual([2, 4]);
    // Kiruvchi tangens: (8,4) - (10,0)
    expect(vertexAt(sub, 1).i).toEqual([-2, 4]);
  });

  it("yopilgan yo'lda takrorlangan oxirgi cho'qqi olib tashlanadi", () => {
    const sub = firstSub("M 0 0 L 10 0 L 10 10 L 0 0 Z");
    expect(sub.closed).toBe(true);
    expect(sub.vertices).toHaveLength(3);
  });

  it("nisbiy buyruqlarni tushunadi", () => {
    const sub = firstSub("m 5 5 l 5 0");
    expect(sub.vertices.map((vertex) => vertex.v)).toEqual([
      [5, 5],
      [10, 5],
    ]);
  });

  it("bir nechta bo'lakni ajratadi", () => {
    const subs = pathToBeziers("M 0 0 L 1 1 Z M 5 5 L 6 6 Z");
    expect(subs).toHaveLength(2);
  });

  it("qo'llab-quvvatlanmaydigan buyruqda xato tashlaydi", () => {
    // Yoy (`A`) ataylab qo'llab-quvvatlanmaydi - jimgina noto'g'ri
    // shakl chizilmasin.
    expect(() => pathToBeziers("M 0 0 A 5 5 0 0 1 10 10")).toThrow();
  });
});

describe("animatsiyali stiker shablonlari", () => {
  for (const animation of STICKER_ANIMATIONS) {
    it(`"${animation}" Telegram cheklovlariga sig'adi`, () => {
      const scene = buildAnimationScene(animation, "check");
      const tgs = tgsFromScene(scene);

      // 64 KB - Telegram chegarasi.
      expect(tgs.length).toBeLessThan(64 * 1024);

      const lottie = JSON.parse(gunzipSync(tgs).toString()) as {
        w: number;
        h: number;
        fr: number;
        op: number;
      };
      expect(lottie.w).toBe(512);
      expect(lottie.h).toBe(512);
      expect(lottie.fr).toBeLessThanOrEqual(60);
      // Davomiyligi 3 soniyadan oshmasin.
      expect(lottie.op / lottie.fr).toBeLessThanOrEqual(3);
    });
  }

  it("Lottie hujjatida taqiqlangan qatlam turlari yo'q", () => {
    for (const animation of STICKER_ANIMATIONS) {
      const lottie = lottieFromScene(buildAnimationScene(animation)) as {
        assets: unknown[];
        layers: { ty: number }[];
      };
      // Rasm/matn qatlami .tgs da taqiqlangan; 4 - "shape layer".
      expect(lottie.assets).toHaveLength(0);
      expect(lottie.layers.every((layer) => layer.ty === 4)).toBe(true);
    }
  });

  it("ko'rish uchun SVG jonli chiqadi", () => {
    const svg = svgFromScene(buildAnimationScene("aylanish", "clock"));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(svg).toContain("animateTransform");
    // Tashqi rasm/shrift ishlatilmaydi.
    expect(svg).not.toContain("<image");
  });
});
