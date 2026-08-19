"use client";

import { useUiMode } from "./UiModeContext";
import {
  useDeviceTier,
  TIER_REASON_TEXT,
  type DeviceTier,
  type TierReason,
} from "./useDeviceTier";

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
 *
 * QURILMA RAD ETSA HAM oxirgi so'z foydalanuvchida: `force()` chaqirilsa
 * 3D baribir yoqiladi (tanlov `localStorage` da saqlanadi). Yagona
 * istisno - WebGL umuman yo'q bo'lsa (`canForce: false`): u holda
 * chizadigan narsaning o'zi yo'q.
 */
export interface ImmersiveState {
  /** 3D / og'ir animatsiyalar chizilsinmi. */
  immersive: boolean;
  /** Foydalanuvchi tanlovi (qurilmadan qat'i nazar). */
  isModern: boolean;
  tier: DeviceTier;
  /** Nega o'chirilgan (`"ok"` - o'chirilmagan). */
  reason: TierReason;
  /** Sababning o'zbekcha izohi (bo'sh - sabab yo'q). */
  reasonText: string;
  /** Foydalanuvchi 3D ni tanlagan, lekin qurilma rad etgan holat. */
  blocked: boolean;
  /** Majburan yoqib bo'ladimi (WebGL bor bo'lsa - ha). */
  canForce: boolean;
  /** Majburiy rejim yoqilganmi. */
  forced: boolean;
  /** Majburiy rejimni yoqish/o'chirish. */
  setForced: (value: boolean) => void;
}

export function useImmersive(): ImmersiveState {
  // `force3d` KONTEKSTDAN olinadi - shunda tugma bosilganda saytdagi
  // HAMMA komponent (sahna ham) buni bir vaqtda biladi.
  const { isModern, force3d: forced, setForce3d: setForced } = useUiMode();
  const { tier, reason, canForce } = useDeviceTier();

  const deviceOk = tier !== "low";
  const allowed = deviceOk || (forced && canForce);
  const immersive = isModern && allowed;

  return {
    immersive,
    isModern,
    // Majburiy rejimda sifat HAR DOIM yengil ("mid"): qurilma zaif
    // deb topilgan edi, shuning uchun soya va yuqori piksel zichligi
    // berilmaydi.
    tier: deviceOk ? tier : "mid",
    reason,
    reasonText: TIER_REASON_TEXT[reason],
    blocked: isModern && !deviceOk && !(forced && canForce),
    canForce,
    forced,
    setForced,
  };
}
