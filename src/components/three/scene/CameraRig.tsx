"use client";

import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";

/**
 * KAMERA HARAKATI — ikki manba, bitta joyda.
 *
 *   1) SICHQONCHA: kursor qayerda bo'lsa kamera o'sha tomonga mayin
 *      suriladi (parallaks). `damp` kadr tezligiga bog'liq emas.
 *   2) SKROLL: `progress` (0 → 1) sahnaga YAQINLASHISHNI boshqaradi.
 *      Qiymatni GSAP ScrollTrigger yozadi (`useHeroScroll`), bu yerda
 *      esa faqat o'qiladi - React qayta render qilinmaydi, ya'ni
 *      skroll paytida ortiqcha ish yo'q.
 *
 * Kamera hech qachon "sakramaydi": har kadrda maqsad tomon
 * yaqinlashadi, shuning uchun progress keskin o'zgarsa ham harakat
 * silliq qoladi.
 */

export interface CameraRigProps {
  /** 0 - hero boshi, 1 - skroll oxiri (GSAP yozadi). */
  progress: RefObject<number>;
  /** Telefon: kamera boshqacha burchakdan va yaqinroqdan qaraydi. */
  compact?: boolean;
}

/** Boshlang'ich va yakuniy kamera holatlari (izometrik → yaqin plan). */
const DESKTOP = { from: new Vector3(3.1, 2.0, 5.6), to: new Vector3(1.15, 0.75, 3.05) };
const MOBILE = { from: new Vector3(0.9, 1.4, 5.9), to: new Vector3(0.3, 0.55, 3.9) };

/** Kamera qaraydigan nuqta ham biroz ko'tariladi (kranga fokus). */
const LOOK_FROM = new Vector3(0, -0.25, 0);
const LOOK_TO = new Vector3(0, 0.35, 0);

/** Yumshoq kirish-chiqish: harakat boshida va oxirida sekinlashadi. */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const target = new Vector3();
const lookAt = new Vector3();

export function CameraRig({ progress, compact = false }: CameraRigProps) {
  useFrame((state, delta) => {
    const path = compact ? MOBILE : DESKTOP;
    const t = easeInOut(MathUtils.clamp(progress.current ?? 0, 0, 1));

    target.lerpVectors(path.from, path.to, t);
    // Sichqoncha parallaksi: telefonda deyarli yo'q (barmoq kursor emas).
    const parallax = compact ? 0.12 : 0.45;
    target.x += state.pointer.x * parallax;
    target.y += state.pointer.y * parallax * 0.6;

    state.camera.position.x = MathUtils.damp(state.camera.position.x, target.x, 3.2, delta);
    state.camera.position.y = MathUtils.damp(state.camera.position.y, target.y, 3.2, delta);
    state.camera.position.z = MathUtils.damp(state.camera.position.z, target.z, 3.2, delta);

    lookAt.lerpVectors(LOOK_FROM, LOOK_TO, t);
    state.camera.lookAt(lookAt);
  });

  return null;
}
