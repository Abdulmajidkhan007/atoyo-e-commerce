"use client";

import { useEffect, useState } from "react";

/**
 * QURILMA QUVVATI — uch pog'ona va SABAB.
 *
 * 3D sahna kuchli qurilmada chiroyli, zaifida esa saytni "muzlatadi"
 * va batareyani yeydi. Lekin mijozlarimizning KO'PCHILIGI telefonda —
 * shuning uchun telefon "yaroqsiz" deb hisoblanmaydi: u sahnani
 * YENGILLASHTIRILGAN sifatda ko'radi.
 *
 *   • `"low"`  — 3D chizilmaydi (sababi `reason` da);
 *   • `"mid"`  — telefon/planshet: sahna chiziladi, past piksel
 *                zichligi va soyasiz (`HeroScene` shunga qaraydi);
 *   • `"high"` — kompyuter: to'liq sifat.
 *
 * MUHIM: `reason` ATAYLAB qaytariladi. Ilgari 3D chizilmasa hech
 * qanday izoh yo'q edi va foydalanuvchi "3D" tugmasini bosib, ekranda
 * bo'sh joy ko'rardi — nima uchunligini bilib bo'lmasdi.
 */

export type DeviceTier = "low" | "mid" | "high";

/** Nega 3D o'chirilgan (foydalanuvchiga ko'rsatiladigan sabab). */
export type TierReason =
  | "ok"
  | "reduced-motion"
  | "save-data"
  | "slow-network"
  | "low-memory"
  | "few-cores"
  | "no-webgl";

export interface DeviceCapability {
  tier: DeviceTier;
  reason: TierReason;
  /**
   * Sabab "yumshoq"mi — ya'ni foydalanuvchi xohlasa 3D ni baribir
   * yoqsa bo'ladimi. WebGL yo'qligi YAGONA qattiq sabab: usiz sahna
   * texnik jihatdan chizilmaydi.
   */
  canForce: boolean;
}

/**
 * ENG KAM TALABLAR — ATAYLAB PAST.
 *
 * Chrome `deviceMemory` ni 0.25/0.5/1/2/4/8 qadamlari bilan beradi:
 * 3GB xotirali telefon **2** deb ko'rsatiladi. Chegara 3 bo'lgani
 * uchun bunday telefonlarda 3D umuman chizilmagan edi — aynan shu
 * sabab foydalanuvchi ekranda bo'sh joy ko'rgan.
 */
const MIN_CPU_CORES = 4;
const MIN_MEMORY_GB = 2;
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
function measure(): DeviceCapability {
  const low = (reason: TierReason, canForce = true): DeviceCapability => ({
    tier: "low",
    reason,
    canForce,
  });

  // WebGL yo'q bo'lsa gap tamom - sahnani chizadigan narsa yo'q.
  if (!hasWebgl()) return low("no-webgl", false);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return low("reduced-motion");

  const nav = navigator as Navigator & {
    connection?: NetworkInformation;
    deviceMemory?: number;
  };

  if (nav.connection?.saveData) return low("save-data");
  const effectiveType = nav.connection?.effectiveType ?? "";
  if (effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g") {
    return low("slow-network");
  }

  // `deviceMemory` va `hardwareConcurrency` hamma brauzerda yo'q -
  // bo'lmasa "yetarli" deb hisoblaymiz (aks holda Safari'da 3D
  // hech qachon ko'rinmasdi).
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < MIN_MEMORY_GB) {
    return low("low-memory");
  }
  if (
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency < MIN_CPU_CORES
  ) {
    return low("few-cores");
  }

  return {
    tier: window.innerWidth >= DESKTOP_WIDTH ? "high" : "mid",
    reason: "ok",
    canForce: true,
  };
}

/**
 * Boshlang'ich qiymat ATAYLAB `"low"`: o'lchov faqat brauzerda
 * bo'ladi, shuning uchun "avval yengil, keyin kerak bo'lsa og'ir"
 * tartibi xavfsiz (server HTML ham shu holatda chiziladi).
 */
export function useDeviceTier(): DeviceCapability {
  const [capability, setCapability] = useState<DeviceCapability>({
    tier: "low",
    reason: "ok",
    canForce: true,
  });

  useEffect(() => {
    // Ochilishni sekinlashtirmaslik uchun bo'sh vaqtda o'lchanadi.
    const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 200));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const handle = idle(() => setCapability(measure()));
    return () => cancel(handle as number);
  }, []);

  return capability;
}

/** Sababning o'zbekcha izohi (foydalanuvchiga ko'rsatiladi). */
export const TIER_REASON_TEXT: Record<TierReason, string> = {
  ok: "",
  "reduced-motion": "telefoningizda «animatsiyani kamaytirish» yoqilgan",
  "save-data": "brauzerda trafik tejash rejimi yoqilgan",
  "slow-network": "internet sekin (2G/3G)",
  "low-memory": "qurilma xotirasi kam",
  "few-cores": "qurilma protsessori zaif",
  "no-webgl": "brauzeringiz 3D grafikani (WebGL) qo'llab-quvvatlamaydi",
};
