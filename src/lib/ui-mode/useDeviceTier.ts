"use client";

import { useEffect, useState } from "react";

/**
 * QURILMA QUVVATI.
 *
 * 3D sahna kuchli telefonda chiroyli, zaifida esa saytni "muzlatadi" va
 * batareyani yeydi. Shuning uchun og'ir qism FAQAT quvvati yetadigan
 * qurilmada yoqiladi; qolganlarga yengil 2D ko'rinish (fallback).
 *
 * Tekshiriladigan belgilar:
 *   • `prefers-reduced-motion` — foydalanuvchi tizimda animatsiyani
 *     kamaytirishni so'ragan (bu TALAB, muhokama qilinmaydi);
 *   • `saveData` / sekin tarmoq — trafik tejalayotgan bo'lsa 1MB lik
 *     3D kutubxonani yuklash noto'g'ri;
 *   • xotira va yadrolar soni;
 *   • ekran kengligi — kichik ekranda 3D baribir ko'rinmaydi;
 *   • WebGL umuman bormi.
 *
 * Boshlang'ich qiymat ATAYLAB `"low"`: o'lchov faqat brauzerda
 * bo'ladi, shuning uchun "avval yengil, keyin kerak bo'lsa og'ir"
 * tartibi xavfsiz (server HTML ham shu holatda chiziladi).
 */

export type DeviceTier = "low" | "high";

/** 3D uchun eng kam talablar. */
const MIN_CPU_CORES = 4;
const MIN_MEMORY_GB = 4;
const MIN_SCREEN_WIDTH = 768;

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

/** Bir marta hisoblanadi (o'lchamlar sahifa ochilgandan keyin o'zgarmaydi). */
function measureTier(): DeviceTier {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "low";
  if (window.innerWidth < MIN_SCREEN_WIDTH) return "low";

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

  return hasWebgl() ? "high" : "low";
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
