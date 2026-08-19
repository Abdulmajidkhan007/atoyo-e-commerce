"use client";

import { useUiMode } from "./UiModeContext";
import { useDeviceTier, type DeviceTier } from "./useDeviceTier";

/**
 * "OG'IR" EFFEKTLAR YOQILADIMI - BITTA QOIDA, BITTA JOY.
 *
 * Qoida: foydalanuvchi 3D rejimni tanlagan BO'LSA va qurilma buni
 * ko'tara olsa (telefon ham - u yengil sifatda chizadi, `tier: "mid"`).
 * Shu shart butun loyihada faqat shu yerda yozilgan - yangi komponent
 * yozganda uni takrorlash SHART EMAS, `useImmersive()` ni chaqiring.
 *
 *   const { immersive } = useImmersive();
 *   return immersive ? <ChiroyliVariant /> : <YengilVariant />;
 */
export function useImmersive(): {
  /** 3D / og'ir animatsiyalar chizilsinmi. */
  immersive: boolean;
  /** Foydalanuvchi tanlovi (qurilmadan qat'i nazar). */
  isModern: boolean;
  tier: DeviceTier;
} {
  const { isModern } = useUiMode();
  const tier = useDeviceTier();

  // "low" - 3D umuman yo'q; "mid" (telefon) va "high" (kompyuter) -
  // chiziladi, sifat farqini `HeroScene` o'zi hal qiladi.
  return { immersive: isModern && tier !== "low", isModern, tier };
}
