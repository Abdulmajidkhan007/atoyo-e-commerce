import {
  GOLD,
  NAVY_DARK,
  WHITE,
  LOGO_LETTER_PATH,
  LOGO_WAVE_PATHS,
  iconFragment,
} from "./art";
import { shapesFromSvgFragment, type Layer, type Scene, type Shape } from "./animate";
import type { StickerAnimation } from "@/types/sticker";

/**
 * ANIMATSIYALI STIKER SHABLONLARI.
 *
 * Har bir shablon `animate.ts` tushunadigan "sahna" qaytaradi.
 * Sahnadan keyin ikkita natija chiqadi: Telegram uchun `.tgs` va
 * admin panelda ko'rish uchun jonli SVG.
 *
 * Do'kon uslubi (mavjud stikerlar bilan bir xil bo'lishi uchun):
 *   • to'q ko'k doira, atrofida oq ingichka halqa;
 *   • o'rtada oltin chiziqli ikonka (`art.ts` dagi 15 tadan biri);
 *   • pastda oq linza ichida ATOYO logotipi.
 */

const AQUA = "#00D2C4";
const CENTER = 256;
const FPS = 60;
/** 2 soniya - Telegram chegarasi 3 soniya. */
const FRAMES = 120;

/** Doira yoyi (kubik egri bilan, 90 gradusli bo'laklarda). */
function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number): string {
  const k = 0.5522847498;
  const segments = Math.max(1, Math.ceil(Math.abs(toDeg - fromDeg) / 90));
  const step = ((toDeg - fromDeg) / segments) * (Math.PI / 180);
  let angle = fromDeg * (Math.PI / 180);
  const point = (a: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

  // Bo'lak burchagiga mos tangens uzunligi.
  const handle = (4 / 3) * Math.tan(step / 4) * r;

  const [sx, sy] = point(angle);
  let d = `M ${sx.toFixed(2)} ${sy.toFixed(2)}`;

  for (let index = 0; index < segments; index++) {
    const end = angle + step;
    const [x1, y1] = point(angle);
    const [x2, y2] = point(end);
    const c1: [number, number] = [x1 - handle * Math.sin(angle), y1 + handle * Math.cos(angle)];
    const c2: [number, number] = [x2 + handle * Math.sin(end), y2 - handle * Math.cos(end)];
    d += ` C ${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(
      2
    )} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
    angle = end;
  }

  return d;
}

/** To'q ko'k fon doirasi va oq halqa. */
function backdropLayers(): Layer[] {
  return [
    {
      name: "fon",
      pivot: [CENTER, CENTER],
      shapes: [{ kind: "ellipse", cx: CENTER, cy: CENTER, r: 250, fill: NAVY_DARK }],
    },
    {
      name: "halqa",
      pivot: [CENTER, CENTER],
      opacity: [55],
      shapes: [
        { kind: "ellipse", cx: CENTER, cy: CENTER, r: 236, stroke: WHITE, width: 6, fill: undefined },
      ],
    },
  ];
}

/** Pastdagi oq linza va ATOYO logotipi. */
function logoLayers(): Layer[] {
  const logoShapes: Shape[] = [
    { kind: "path", d: LOGO_LETTER_PATH, fill: NAVY_DARK },
    ...LOGO_WAVE_PATHS.map((d): Shape => ({ kind: "path", d, fill: GOLD })),
  ];

  return [
    {
      name: "linza",
      pivot: [CENTER, 402],
      shapes: [{ kind: "ellipse", cx: CENTER, cy: 402, r: 62, fill: WHITE }],
    },
    {
      name: "logo",
      // Logotip 120x104 maydonda chizilgan - markazi (60, 52).
      pivot: [60, 52],
      position: [CENTER, 400],
      scale: [62, 62],
      shapes: logoShapes,
    },
  ];
}

/** O'rtadagi oltin ikonka (100x100 maydonda chizilgan). */
function iconLayer(icon: string, overrides: Partial<Layer> = {}): Layer {
  const fragment = iconFragment(icon) ?? iconFragment("star") ?? "";
  return {
    name: "ikonka",
    pivot: [50, 50],
    position: [CENTER, 228],
    scale: [300, 300],
    shapes: shapesFromSvgFragment(fragment, { stroke: GOLD, width: 5 }),
    ...overrides,
  };
}

/** To'liq doira - yo'l (path) ko'rinishida. */
function circlePath(cx: number, cy: number, r: number): string {
  return arcPath(cx, cy, r, -90, 270) + " Z";
}

/**
 * Ikonka chiziqlari "chizilib borishi" uchun trim qo'shadi.
 *
 * Doiralar ham YO'LGA aylantiriladi: `trim` faqat yo'lda ishlaydi,
 * aks holda doira birinchi kadrdanoq to'liq chizilgan turardi.
 */
function withTrim(shapes: Shape[]): Shape[] {
  return shapes.map((shape, index) => {
    const path: Shape =
      shape.kind === "ellipse"
        ? {
            kind: "path",
            d: circlePath(shape.cx, shape.cy, shape.r),
            stroke: shape.stroke,
            fill: shape.fill,
            width: shape.width,
          }
        : shape;

    // Har bir chiziq navbat bilan chizilsin.
    const start = Math.min(0.5, index * 0.14);
    return {
      ...path,
      trim: {
        keys: [
          { t: 0, v: [0] },
          { t: Math.round(FRAMES * start), v: [0] },
          { t: Math.round(FRAMES * (start + 0.35)), v: [100] },
          { t: FRAMES, v: [100] },
        ],
      },
    };
  });
}

type Builder = (icon: string) => Scene;

const BUILDERS: Record<StickerAnimation, Builder> = {
  // Nafas olish: ikonka asta kattalashib-kichrayadi, halqa ham.
  puls: (icon) => ({
    fps: FPS,
    frames: FRAMES,
    layers: [
      ...backdropLayers(),
      iconLayer(icon, {
        scale: {
          keys: [
            { t: 0, v: [300, 300] },
            { t: FRAMES / 2, v: [345, 345] },
            { t: FRAMES, v: [300, 300] },
          ],
        },
      }),
      ...logoLayers(),
    ],
  }),

  // Kutish: ikonka qimirlamaydi, atrofida oltin yoy aylanadi.
  aylanish: (icon) => ({
    fps: FPS,
    frames: FRAMES,
    layers: [
      ...backdropLayers(),
      {
        name: "yoy",
        pivot: [CENTER, CENTER],
        rotation: {
          keys: [
            { t: 0, v: [0] },
            { t: FRAMES, v: [360] },
          ],
          linear: true,
        },
        shapes: [
          { kind: "path", d: arcPath(CENTER, CENTER, 214, -90, 170), stroke: GOLD, width: 12 },
        ],
      },
      iconLayer(icon, { scale: [260, 260], position: [CENTER, 236] }),
      ...logoLayers(),
    ],
  }),

  // Tasdiq: chiziqlar ko'z oldida chiziladi.
  chizish: (icon) => {
    const base = iconLayer(icon);
    return {
      fps: FPS,
      frames: FRAMES,
      layers: [
        ...backdropLayers(),
        { ...base, shapes: withTrim(base.shapes) },
        ...logoLayers(),
      ],
    };
  },

  // Savatga qo'shildi: ikonka sakrab tushadi.
  sakrash: (icon) => ({
    fps: FPS,
    frames: FRAMES,
    layers: [
      ...backdropLayers(),
      iconLayer(icon, {
        position: {
          keys: [
            { t: 0, v: [CENTER, 228] },
            { t: FRAMES * 0.3, v: [CENTER, 180] },
            { t: FRAMES * 0.6, v: [CENTER, 236] },
            { t: FRAMES * 0.78, v: [CENTER, 214] },
            { t: FRAMES, v: [CENTER, 228] },
          ],
        },
      }),
      ...logoLayers(),
    ],
  }),

  // Diqqat / xatolik: chapga-o'ngga tebranish.
  tebranish: (icon) => ({
    fps: FPS,
    frames: FRAMES,
    layers: [
      ...backdropLayers(),
      iconLayer(icon, {
        rotation: {
          keys: [
            { t: 0, v: [0] },
            { t: FRAMES * 0.08, v: [-14] },
            { t: FRAMES * 0.18, v: [14] },
            { t: FRAMES * 0.28, v: [-10] },
            { t: FRAMES * 0.38, v: [10] },
            { t: FRAMES * 0.48, v: [0] },
            { t: FRAMES, v: [0] },
          ],
        },
      }),
      ...logoLayers(),
    ],
  }),

  // Santexnikaga xos: tomchi tushadi, to'lqin tarqaladi.
  tomchi: () => ({
    fps: FPS,
    frames: FRAMES,
    layers: [
      ...backdropLayers(),
      {
        name: "tolqin",
        pivot: [CENTER, 300],
        opacity: {
          keys: [
            { t: 0, v: [0] },
            { t: FRAMES * 0.45, v: [0] },
            { t: FRAMES * 0.55, v: [80] },
            { t: FRAMES * 0.95, v: [0] },
            { t: FRAMES, v: [0] },
          ],
        },
        scale: {
          keys: [
            { t: 0, v: [30, 30] },
            { t: FRAMES * 0.5, v: [40, 40] },
            { t: FRAMES, v: [150, 150] },
          ],
        },
        shapes: [{ kind: "ellipse", cx: CENTER, cy: 300, r: 90, stroke: AQUA, width: 10 }],
      },
      {
        name: "tomchi",
        // Tomchi 100x100 maydonda (`art.ts` dagi droplet ikonkasi).
        pivot: [50, 50],
        scale: [230, 230],
        // Tomchi BIRINCHI kadrdanoq ko'rinadi: stiker ro'yxatda
        // to'xtab turganda bo'sh doira ko'rinmasin.
        position: {
          keys: [
            { t: 0, v: [CENTER, 150] },
            { t: FRAMES * 0.45, v: [CENTER, 286] },
            { t: FRAMES * 0.6, v: [CENTER, 286] },
            { t: FRAMES * 0.75, v: [CENTER, 150] },
            { t: FRAMES, v: [CENTER, 150] },
          ],
        },
        opacity: {
          keys: [
            { t: 0, v: [100] },
            { t: FRAMES * 0.45, v: [100] },
            { t: FRAMES * 0.55, v: [0] },
            { t: FRAMES * 0.72, v: [0] },
            { t: FRAMES * 0.8, v: [100] },
            { t: FRAMES, v: [100] },
          ],
        },
        shapes: shapesFromSvgFragment(iconFragment("droplet") ?? "", { fill: AQUA }),
      },
      ...logoLayers(),
    ],
  }),
};

/** Tanlangan shablon bo'yicha sahna yasaydi. */
export function buildAnimationScene(animation: StickerAnimation, icon = "star"): Scene {
  return BUILDERS[animation](icon);
}
