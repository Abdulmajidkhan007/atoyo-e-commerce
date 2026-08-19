"use client";

import { useEffect } from "react";
import { useUiMode } from "./UiModeContext";

/**
 * 3D REJIMNI ADMIN YOQMAGUNCHA O'CHIRIB TURADI.
 *
 * Rejim tanlovi brauzerda (`localStorage`) saqlanadi, admin sozlamasi
 * esa serverda. Ikkalasi bir-birini bilmaydi, shuning uchun quyidagi
 * holat bo'lishi mumkin: mijoz 3D ni tanlab qo'ygan, keyin admin uni
 * o'chirgan - almashtirish tugmasi yo'qoladi va mijoz 3D da "qamalib"
 * qoladi. Shu komponent aynan o'shani tuzatadi: ruxsat yo'q bo'lsa
 * saqlangan tanlovni klassikka qaytaradi.
 *
 * Hech narsa chizmaydi.
 */
export function Ui3dGate({ enabled }: { enabled: boolean }) {
  const { mode, ready, setMode } = useUiMode();

  useEffect(() => {
    if (enabled || !ready || mode === "classic") return;
    // Effekt ichida to'g'ridan-to'g'ri setState chaqirish React compiler
    // qoidasini buzadi - mikrovazifaga suriladi (UiModeContext bilan bir xil).
    const timer = setTimeout(() => setMode("classic"), 0);
    return () => clearTimeout(timer);
  }, [enabled, ready, mode, setMode]);

  return null;
}
