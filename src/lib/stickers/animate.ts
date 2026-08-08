import { gzipSync } from "node:zlib";

/**
 * ANIMATSIYALI TELEGRAM STIKERI (.tgs) - SAYTNING O'ZIDA YASALADI.
 *
 * Telegram animatsiyali stiker uchun `.tgs` formatini talab qiladi.
 * `.tgs` - bu sirli format emas: u oddiy **Lottie JSON** ning gzip
 * bilan siqilgani. Ya'ni video kodlash, `ffmpeg`, tashqi kutubxona
 * kerak EMAS - JSON yasab, `zlib` bilan siqsak bo'ldi.
 *
 * Telegram cheklovlari (buzilsa fayl qabul qilinmaydi):
 *   • aniq 512x512, davomiyligi 3 soniyagacha, 30 yoki 60 fps;
 *   • gzip'dan keyin 64 KB dan oshmasin;
 *   • RASM, MATN QATLAMI, effekt, ifoda (expression), maska va
 *     "merge paths" ISHLATILMAYDI - faqat vektor shakllar.
 *
 * Oxirgi cheklov sababli animatsiyali stikerda YOZUV bo'lmaydi
 * (harflar shakl sifatida chizilishi kerak edi). Shuning uchun
 * animatsiyali shablonlar do'konning ikonkalari va logotipi ustiga
 * qurilgan - ular allaqachon vektor (`art.ts`).
 *
 * Shu yerda bitta "sahna" tavsifidan IKKI natija chiqadi:
 *   1) `tgsFromScene()` - Telegramga yuboriladigan `.tgs`;
 *   2) `svgFromScene()`  - admin panelda ko'rinadigan jonli SVG
 *      (SMIL animatsiyasi, tashqi kutubxonasiz).
 * Ikkalasi bitta manbadan chiqqani uchun ko'rinish bilan haqiqiy
 * stiker bir-biridan farq qilmaydi.
 */

export const STICKER_SIZE = 512;

/** Bitta kalit kadr: `t` - kadr raqami, `v` - qiymat(lar). */
export interface Keyframe {
  t: number;
  v: number[];
}

/** Xossa: o'zgarmas qiymat yoki kalit kadrlar. */
export type Prop = number[] | { keys: Keyframe[]; linear?: boolean };

export type Shape =
  | {
      kind: "ellipse";
      cx: number;
      cy: number;
      r: number;
      fill?: string;
      stroke?: string;
      width?: number;
    }
  | {
      kind: "path";
      d: string;
      fill?: string;
      stroke?: string;
      width?: number;
      /** Chiziqning necha foizi chizilgani (0-100). "Chizilib borish" effekti. */
      trim?: Prop;
    };

export interface Layer {
  name: string;
  shapes: Shape[];
  /** Aylanish/kattalashish markazi (shakllar koordinatasida). */
  pivot: [number, number];
  /** Markaz 512x512 maydonda qayerga qo'yilsin. */
  position?: Prop;
  /** Foizda (100 = asl o'lcham). */
  scale?: Prop;
  /** Gradusda. */
  rotation?: Prop;
  /** 0-100. */
  opacity?: Prop;
}

export interface Scene {
  fps: number;
  frames: number;
  layers: Layer[];
}

// ---------------------------------------------------------------
// SVG YO'LINI (path) EGRI CHIZIQLARGA AYLANTIRISH
// ---------------------------------------------------------------

type Point = [number, number];

interface Vertex {
  v: Point;
  /** Kiruvchi tangens (cho'qqiga NISBATAN). */
  i: Point;
  /** Chiquvchi tangens (cho'qqiga NISBATAN). */
  o: Point;
}

interface SubPath {
  vertices: Vertex[];
  closed: boolean;
}

const NUMBER = String.raw`-?\d*\.?\d+(?:e[-+]?\d+)?`;
const PATH_TOKEN = new RegExp(`([MmLlHhVvCcSsQqTtZz])|(${NUMBER})`, "gi");

/**
 * SVG `d` atributini Lottie egri chiziqlariga aylantiradi.
 *
 * Qo'llab-quvvatlanadi: M L H V C S Q T Z (katta va kichik harf).
 * Yoy (`A`) ATAYLAB yo'q - do'kon grafikasida ishlatilmaydi va uni
 * egri chiziqqa aylantirish uzun kod talab qiladi. Kutilmagan
 * buyruq kelsa xato tashlanadi, jimgina noto'g'ri shakl chizilmaydi.
 */
export function pathToBeziers(d: string): SubPath[] {
  const tokens: (string | number)[] = [];
  for (const match of d.matchAll(PATH_TOKEN)) {
    tokens.push(match[1] ?? Number(match[2]));
  }

  const subPaths: SubPath[] = [];
  let current: SubPath | null = null;
  let command = "";
  let cursor: Point = [0, 0];
  let start: Point = [0, 0];
  // Silliq (S/T) buyruqlar uchun oldingi boshqaruv nuqtasi.
  let lastControl: Point | null = null;
  let index = 0;

  const next = (): number => {
    const value = tokens[index++];
    if (typeof value !== "number") throw new Error(`SVG yo'lida son kutilgandi: ${d}`);
    return value;
  };

  const push = (point: Point) => {
    if (!current) throw new Error(`SVG yo'li "M" bilan boshlanmagan: ${d}`);
    current.vertices.push({ v: point, i: [0, 0], o: [0, 0] });
  };

  /** Kubik egri: joriy nuqtadan `end` gacha, boshqaruv nuqtalari bilan. */
  const curve = (c1: Point, c2: Point, end: Point) => {
    if (!current) throw new Error(`SVG yo'li "M" bilan boshlanmagan: ${d}`);
    const from = current.vertices.at(-1);
    if (!from) throw new Error(`SVG yo'lida boshlang'ich nuqta yo'q: ${d}`);
    from.o = [c1[0] - from.v[0], c1[1] - from.v[1]];
    current.vertices.push({ v: end, i: [c2[0] - end[0], c2[1] - end[1]], o: [0, 0] });
    lastControl = c2;
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (typeof token === "string") {
      command = token;
      index++;
    } else if (command === "M") {
      command = "L";
    } else if (command === "m") {
      command = "l";
    }

    const relative = command === command.toLowerCase();
    const [cx, cy] = cursor;

    switch (command.toUpperCase()) {
      case "M": {
        const x = next() + (relative ? cx : 0);
        const y = next() + (relative ? cy : 0);
        current = { vertices: [], closed: false };
        subPaths.push(current);
        cursor = [x, y];
        start = cursor;
        push(cursor);
        lastControl = null;
        break;
      }
      case "L": {
        const x = next() + (relative ? cx : 0);
        const y = next() + (relative ? cy : 0);
        cursor = [x, y];
        push(cursor);
        lastControl = null;
        break;
      }
      case "H": {
        const x = next() + (relative ? cx : 0);
        cursor = [x, cy];
        push(cursor);
        lastControl = null;
        break;
      }
      case "V": {
        const y = next() + (relative ? cy : 0);
        cursor = [cx, y];
        push(cursor);
        lastControl = null;
        break;
      }
      case "C": {
        const c1: Point = [next() + (relative ? cx : 0), next() + (relative ? cy : 0)];
        const c2: Point = [next() + (relative ? cx : 0), next() + (relative ? cy : 0)];
        const end: Point = [next() + (relative ? cx : 0), next() + (relative ? cy : 0)];
        curve(c1, c2, end);
        cursor = end;
        break;
      }
      case "S": {
        // Birinchi boshqaruv nuqtasi - oldingisining aksi.
        const c1: Point = lastControl
          ? [2 * cx - lastControl[0], 2 * cy - lastControl[1]]
          : [cx, cy];
        const c2: Point = [next() + (relative ? cx : 0), next() + (relative ? cy : 0)];
        const end: Point = [next() + (relative ? cx : 0), next() + (relative ? cy : 0)];
        curve(c1, c2, end);
        cursor = end;
        break;
      }
      case "Q":
      case "T": {
        // Kvadratik egri kubikka o'tkaziladi (Lottie faqat kubikni biladi).
        const control: Point =
          command.toUpperCase() === "Q"
            ? [next() + (relative ? cx : 0), next() + (relative ? cy : 0)]
            : lastControl
              ? [2 * cx - lastControl[0], 2 * cy - lastControl[1]]
              : [cx, cy];
        const end: Point = [next() + (relative ? cx : 0), next() + (relative ? cy : 0)];
        const c1: Point = [cx + (2 / 3) * (control[0] - cx), cy + (2 / 3) * (control[1] - cy)];
        const c2: Point = [
          end[0] + (2 / 3) * (control[0] - end[0]),
          end[1] + (2 / 3) * (control[1] - end[1]),
        ];
        curve(c1, c2, end);
        lastControl = control;
        cursor = end;
        break;
      }
      case "Z": {
        if (current) {
          current.closed = true;
          // Yopilgan yo'lda oxirgi cho'qqi boshlang'ichning nusxasi
          // bo'lsa - Lottie uni ikki marta chizadi, olib tashlaymiz.
          const last = current.vertices.at(-1);
          if (
            current.vertices.length > 1 &&
            last &&
            Math.abs(last.v[0] - start[0]) < 0.01 &&
            Math.abs(last.v[1] - start[1]) < 0.01
          ) {
            const first = current.vertices[0];
            if (first) first.i = last.i;
            current.vertices.pop();
          }
        }
        cursor = start;
        lastControl = null;
        break;
      }
      default:
        throw new Error(`SVG yo'lida qo'llab-quvvatlanmaydigan buyruq: "${command}"`);
    }
  }

  return subPaths.filter((sub) => sub.vertices.length > 0);
}

/**
 * `art.ts` dagi ikonka bo'lagidan (`<path>` / `<circle>` teglari)
 * shakllar ro'yxatini yasaydi. Shu tufayli mavjud 15 ta ikonka
 * qayta chizilmasdan animatsiyada ishlatiladi.
 */
export function shapesFromSvgFragment(
  fragment: string,
  paint: { stroke?: string; fill?: string; width?: number }
): Shape[] {
  const shapes: Shape[] = [];

  for (const match of fragment.matchAll(/<path[^>]*\sd="([^"]+)"/g)) {
    if (match[1]) shapes.push({ kind: "path", d: match[1], ...paint });
  }

  for (const match of fragment.matchAll(
    /<circle[^>]*\scx="([\d.-]+)"[^>]*\scy="([\d.-]+)"[^>]*\sr="([\d.-]+)"/g
  )) {
    shapes.push({
      kind: "ellipse",
      cx: Number(match[1]),
      cy: Number(match[2]),
      r: Number(match[3]),
      ...paint,
    });
  }

  return shapes;
}

// ---------------------------------------------------------------
// LOTTIE
// ---------------------------------------------------------------

function rgba(hex: string): number[] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
    1,
  ];
}

/** Silliq kirish/chiqish (AE dagi "easy ease" ga yaqin). */
const EASE_IN = { x: [0.4], y: [0] };
const EASE_OUT = { x: [0.6], y: [1] };
const LINEAR_IN = { x: [0.333], y: [0.333] };
const LINEAR_OUT = { x: [0.667], y: [0.667] };

type LottieValue = { a: 0; k: number[] } | { a: 1; k: Record<string, unknown>[] };

function lottieProp(prop: Prop | undefined, fallback: number[]): LottieValue {
  if (!prop) return { a: 0, k: fallback };
  if (Array.isArray(prop)) return { a: 0, k: prop };

  const { keys, linear } = prop;
  const first = keys[0];
  if (!first) return { a: 0, k: fallback };
  if (keys.length === 1) return { a: 0, k: first.v };

  return {
    a: 1,
    k: keys.map((key, index) => {
      const next = keys[index + 1];
      return next
        ? {
            t: key.t,
            s: key.v,
            // `e` eskirgan maydon, lekin rlottie (Telegram) uni ham
            // o'qiydi - eski mijozlarda ham to'g'ri ko'rinsin.
            e: next.v,
            i: linear ? LINEAR_OUT : EASE_OUT,
            o: linear ? LINEAR_IN : EASE_IN,
          }
        : { t: key.t, s: key.v };
    }),
  };
}

function lottieShapeItems(shape: Shape): Record<string, unknown>[] {
  const geometry: Record<string, unknown>[] =
    shape.kind === "ellipse"
      ? [
          {
            ty: "el",
            p: { a: 0, k: [shape.cx, shape.cy] },
            s: { a: 0, k: [shape.r * 2, shape.r * 2] },
            d: 1,
            nm: "el",
          },
        ]
      : pathToBeziers(shape.d).map((sub) => ({
          ty: "sh",
          ind: 0,
          ks: {
            a: 0,
            k: {
              i: sub.vertices.map((vertex) => vertex.i),
              o: sub.vertices.map((vertex) => vertex.o),
              v: sub.vertices.map((vertex) => vertex.v),
              c: sub.closed,
            },
          },
          nm: "sh",
        }));

  const paint: Record<string, unknown>[] = [];
  if (shape.fill) {
    paint.push({ ty: "fl", c: { a: 0, k: rgba(shape.fill) }, o: { a: 0, k: 100 }, r: 1, nm: "fl" });
  }
  if (shape.stroke) {
    paint.push({
      ty: "st",
      c: { a: 0, k: rgba(shape.stroke) },
      o: { a: 0, k: 100 },
      w: { a: 0, k: shape.width ?? 5 },
      lc: 2,
      lj: 2,
      nm: "st",
    });
  }

  const trim: Record<string, unknown>[] =
    shape.kind === "path" && shape.trim
      ? [
          {
            ty: "tm",
            s: { a: 0, k: 0 },
            e: lottieProp(shape.trim, [100]),
            o: { a: 0, k: 0 },
            m: 1,
            nm: "tm",
          },
        ]
      : [];

  return [
    {
      ty: "gr",
      nm: "gr",
      it: [
        ...geometry,
        ...trim,
        ...paint,
        {
          ty: "tr",
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 },
          sk: { a: 0, k: 0 },
          sa: { a: 0, k: 0 },
          nm: "tr",
        },
      ],
    },
  ];
}

/** Sahnadan Lottie hujjati (JSON obyekt). */
export function lottieFromScene(scene: Scene): Record<string, unknown> {
  return {
    v: "5.5.7",
    fr: scene.fps,
    ip: 0,
    op: scene.frames,
    w: STICKER_SIZE,
    h: STICKER_SIZE,
    nm: "atoyo",
    ddd: 0,
    assets: [],
    layers: scene.layers.map((layer, index) => ({
      ddd: 0,
      ind: index + 1,
      ty: 4,
      nm: layer.name,
      sr: 1,
      ks: {
        o: lottieProp(layer.opacity, [100]),
        r: lottieProp(layer.rotation, [0]),
        // Qatlam markazi shakllar koordinatasida `pivot` da turadi;
        // uni 512x512 maydonda `position` ga ko'chiramiz. Shunda
        // aylanish va kattalashish aynan pivot atrofida bo'ladi.
        p: lottieProp(layer.position, [...layer.pivot]),
        a: { a: 0, k: [...layer.pivot, 0] },
        s: lottieProp(layer.scale, [100, 100]),
      },
      ao: 0,
      shapes: layer.shapes.flatMap(lottieShapeItems),
      ip: 0,
      op: scene.frames,
      st: 0,
      bm: 0,
    })),
  };
}

/** Telegram uchun tayyor `.tgs` (gzip qilingan Lottie). */
export function tgsFromScene(scene: Scene): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(lottieFromScene(scene))), { level: 9 });
}

// ---------------------------------------------------------------
// KO'RISH UCHUN JONLI SVG (SMIL)
// ---------------------------------------------------------------

/** Massivdan qiymat; yo'q bo'lsa zaxira qiymat qaytadi. */
function at(values: number[] | null | undefined, index: number, fallback = 0): number {
  return values?.[index] ?? fallback;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Xossani SMIL animatsiyasiga aylantiradi. Statik bo'lsa `null`
 * qaytadi - chaqiruvchi uni oddiy atribut sifatida yozadi.
 */
function smilValues(
  prop: Prop | undefined,
  frames: number,
  format: (value: number[]) => string
): { values: string; keyTimes: string; splines: string } | null {
  if (!prop || Array.isArray(prop) || prop.keys.length < 2) return null;

  const { keys, linear } = prop;
  return {
    values: keys.map((key) => format(key.v)).join(";"),
    keyTimes: keys.map((key) => (key.t / frames).toFixed(4)).join(";"),
    splines: keys
      .slice(0, -1)
      .map(() => (linear ? "0.333 0.333 0.667 0.667" : "0.4 0 0.6 1"))
      .join(";"),
  };
}

function smilAnimate(
  attribute: string,
  type: string | null,
  data: { values: string; keyTimes: string; splines: string },
  duration: number
): string {
  const tag = type ? "animateTransform" : "animate";
  return `<${tag} attributeName="${attribute}"${type ? ` type="${type}"` : ""} calcMode="spline" values="${escapeAttr(data.values)}" keyTimes="${data.keyTimes}" keySplines="${data.splines}" dur="${duration}s" repeatCount="indefinite" />`;
}

function svgShape(shape: Shape, frames: number, duration: string): string {
  const paint = [
    shape.fill ? `fill="${shape.fill}"` : `fill="none"`,
    shape.stroke ? `stroke="${shape.stroke}"` : "",
    shape.stroke ? `stroke-width="${shape.width ?? 5}"` : "",
    shape.stroke ? `stroke-linecap="round" stroke-linejoin="round"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (shape.kind === "ellipse") {
    return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" ${paint} />`;
  }

  // "Chizilib borish" - `pathLength="1"` bilan uzunlik normallashadi,
  // shuning uchun haqiqiy uzunlikni hisoblash shart emas.
  if (shape.trim && !Array.isArray(shape.trim)) {
    const keys = shape.trim.keys;
    const values = keys.map((key) => (1 - (key.v[0] ?? 0) / 100).toFixed(3));
    const offsets = values.join(";");
    const times = keys.map((key) => (key.t / frames).toFixed(4)).join(";");
    return `<path d="${escapeAttr(shape.d)}" ${paint} pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${values[0] ?? 0}"><animate attributeName="stroke-dashoffset" values="${offsets}" keyTimes="${times}" dur="${duration}" repeatCount="indefinite" /></path>`;
  }

  return `<path d="${escapeAttr(shape.d)}" ${paint} />`;
}

/**
 * Admin panelda ko'rish uchun jonli SVG. Lottie bilan BIR XIL
 * sahnadan chiziladi, shuning uchun ko'rinish haqiqiy stikerdan
 * farq qilmaydi (brauzerda Lottie o'quvchi kutubxona kerak emas).
 */
export function svgFromScene(scene: Scene): string {
  const seconds = scene.frames / scene.fps;
  const duration = seconds.toFixed(3) + "s";

  const layers = scene.layers.map((layer) => {
    const [ax, ay] = layer.pivot;

    const opacity = smilValues(layer.opacity, scene.frames, (value) =>
      (at(value, 0, 100) / 100).toFixed(3)
    );
    // Lottie qoidasi: nuqta = (shakl - pivot) * masshtab, aylantirilib,
    // so'ng `position` ga ko'chiriladi. SVG'da xuddi shu tartib ichma-ich
    // <g> lar bilan tiklanadi (pastdan yuqoriga):
    //   translate(-pivot) → scale → rotate → translate(pivot) → translate(position - pivot)
    // Masshtab va aylanish MARKAZ atrofida bo'lishi uchun ular
    // translate(-pivot) va translate(pivot) orasida turadi.
    const position = smilValues(
      layer.position,
      scene.frames,
      (value) => `${at(value, 0) - ax} ${at(value, 1) - ay}`
    );
    const rotation = smilValues(layer.rotation, scene.frames, (value) => `${at(value, 0)}`);
    const scale = smilValues(
      layer.scale,
      scene.frames,
      (value) =>
        `${(at(value, 0, 100) / 100).toFixed(4)} ${(at(value, 1, at(value, 0, 100)) / 100).toFixed(4)}`
    );

    const staticPosition = Array.isArray(layer.position) ? layer.position : null;
    const staticScale = Array.isArray(layer.scale) ? layer.scale : null;
    const staticRotation = Array.isArray(layer.rotation) ? layer.rotation : null;
    const staticOpacity = Array.isArray(layer.opacity) ? layer.opacity : null;

    const shapes = layer.shapes.map((shape) => svgShape(shape, scene.frames, duration)).join("");

    // 1) Shakllarni markazga keltiramiz.
    let inner = `<g transform="translate(${-ax} ${-ay})">${shapes}</g>`;

    // 2) Masshtab (animatsiyali bo'lsa <g> ning o'z transform'i almashadi).
    inner = scale
      ? `<g>${smilAnimate("transform", "scale", scale, seconds)}${inner}</g>`
      : `<g transform="scale(${(at(staticScale, 0, 100) / 100).toFixed(4)})">${inner}</g>`;

    // 3) Aylanish.
    inner = rotation
      ? `<g>${smilAnimate("transform", "rotate", rotation, seconds)}${inner}</g>`
      : `<g transform="rotate(${at(staticRotation, 0)})">${inner}</g>`;

    // 4) Markazni joyiga qaytarib, `position` ga ko'chiramiz.
    inner = `<g transform="translate(${ax} ${ay})">${inner}</g>`;
    inner = position
      ? `<g>${smilAnimate("transform", "translate", position, seconds)}${inner}</g>`
      : `<g transform="translate(${staticPosition ? at(staticPosition, 0) - ax : 0} ${
          staticPosition ? at(staticPosition, 1) - ay : 0
        })">${inner}</g>`;

    return `<g opacity="${at(staticOpacity, 0, 100) / 100}">${
      opacity ? smilAnimate("opacity", null, opacity, seconds) : ""
    }${inner}</g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STICKER_SIZE} ${STICKER_SIZE}" width="${STICKER_SIZE}" height="${STICKER_SIZE}">${layers.join(
    ""
  )}</svg>`;
}
