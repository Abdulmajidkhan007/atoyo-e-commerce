"use client";

import { useEffect, useState } from "react";

/**
 * QURILMA QUVVATI — uch pog'ona.
 *
 * 3D sahna kuchli qurilmada chiroyli, zaifida esa saytni "muzlatadi"
 * va batareyani yeydi. Lekin mijozlarimizning KO'PCHILIGI telefonda —
 * shuning uchun telefon "yaroqsiz" deb hisoblanmaydi: u sahnani
 * YENGILLASHTIRILGAN sifatda ko'radi.
 *
 *   • `"low"`  — 3D umuman chizilmaydi (o'rniga yengil bezak);
 *   • `"mid"`  — telefon/planshet: sahna chiziladi, lekin past
 *                piksel zichligi va soyasiz (`HeroScene` shunga qaraydi);
 *   • `"high"` — kompyuter: to'liq sifat.
 *
 * `"low"` bo'lish sabablari (qat'iy):
 *   • `prefers-reduced-motion` — foydalanuvchi tizimda animatsiyani
 *     kamaytirishni so'ragan (bu TALAB, muhokama qilinmaydi);
 *   • `saveData` yoki 2G/3G — trafik tejalayotgan bo'lsa ~1MB lik
 *     3D kutubxonani yuklash noto'g'ri;
 *   • juda kam xotira/yadro yoki WebGL yo'q (eski telefonlar).
 *
 * Boshlang'ich qiymat ATAYLAB `"low"`: o'lchov faqat brauzerda
 * bo'ladi, shuning uchun "avval yengil, keyin kerak bo'lsa og'ir"
 * tartibi xavfsiz (server HTML ham shu holatda chiziladi).
 */

export type DeviceTier = "low" | "mid" | "high";

/**
 * ENG KAM TALABLAR. Bular ATAYLAB past: 2020-yildan keyingi oddiy
 * telefon ham (4 yadro, 4GB) shu sinovdan o'tadi. Ilgari bu yerda
 * "ekran ≥ 768px" sharti bor edi va TELEFONDA 3D umuman chizilmasdi —
 * foydalanuvchi tugmada "3D" yozuvini ko'rib, ekranda esa hech
 * qanday 3D ko'rmasdi.
 */
const MIN_CPU_CORES = 4;
const MIN_MEMORY_GB = 3;
/** Shu kenglikdan tor ekran - telefon: sahna yengil sifatda chiziladi. */
const DESKTOP_WIDTH = 768;

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

function hasWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Bir marta hisoblanadi (bu qiymatlar sahifa ochilgach o'zgarmaydi). */
function measureTier(): DeviceTier {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "low";

  const nav = navigator as Navigator & {
    connection?: NetworkInformation;
    deviceMemory?: number;
  };

  if (nav.connection?.saveData) return "low";
  const effectiveType = nav.connection?.effectiveType ?? "";
  if (effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g") return "low";

  // `deviceMemory` va `hardwareConcurrency` hamma brauzerda yo'q -
  // bo'lmasa "yetarli" deb hisoblaymiz (aks holda Safari'da 3D
  // hech qachon ko'rinmasdi).
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < MIN_MEMORY_GB) return "low";
  if (
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency < MIN_CPU_CORES
  ) {
    return "low";
  }

  if (!hasWebgl()) return "low";

  return window.innerWidth >= DESKTOP_WIDTH ? "high" : "mid";
}

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>("low");

  useEffect(() => {
    // Ochilishni sekinlashtirmaslik uchun bo'sh vaqtda o'lchanadi.
    const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 200));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const handle = idle(() => setTier(measureTier()));
    return () => cancel(handle as number);
  }, []);

  return tier;
}
