/**
 * QOPLAMA (finish) TURLARI — 3D modellarning materiali.
 *
 * Bitta manba: konfigurator ham, sahnadagi modellar ham shu ro'yxatdan
 * o'qiydi. Yangi qoplama qo'shilsa faqat shu fayl o'zgaradi.
 *
 * `gradient` — UI dagi rang doirasi uchun (CSS), 3D bilan aloqasi yo'q.
 */

export type FinishId = "chrome" | "gold" | "matte";

export interface Finish {
  id: FinishId;
  label: string;
  /** Materialning asosiy rangi. */
  color: string;
  metalness: number;
  roughness: number;
  /** Tugmachadagi doira uchun CSS gradient. */
  gradient: string;
}

export const FINISHES: Finish[] = [
  {
    id: "chrome",
    label: "Xrom",
    color: "#f0f2f5",
    metalness: 1,
    roughness: 0.08,
    gradient: "linear-gradient(135deg,#ffffff 0%,#c9d3dc 45%,#8d99a6 100%)",
  },
  {
    id: "gold",
    label: "Tillarang",
    color: "#d4af37",
    metalness: 0.9,
    roughness: 0.28,
    gradient: "linear-gradient(135deg,#f7e7b4 0%,#d4af37 45%,#8a6a1f 100%)",
  },
  {
    id: "matte",
    label: "Mat qora",
    color: "#1a1a1a",
    metalness: 0.15,
    roughness: 0.75,
    gradient: "linear-gradient(135deg,#4a4a4a 0%,#1f1f1f 55%,#000000 100%)",
  },
];

export const DEFAULT_FINISH: FinishId = "chrome";

export function findFinish(id: FinishId | string | undefined): Finish {
  return FINISHES.find((item) => item.id === id) ?? FINISHES[0]!;
}

/**
 * Materialga beriladigan proplar. Parametrik (koddan yasalgan)
 * modellar shuni to'g'ridan-to'g'ri `<meshStandardMaterial {...}/>`
 * ga uzatadi; `.glb` modellarda esa `applyFinish()` ishlatiladi.
 */
export function finishMaterialProps(finish: Finish): {
  color: string;
  metalness: number;
  roughness: number;
} {
  return { color: finish.color, metalness: finish.metalness, roughness: finish.roughness };
}
