"use client";

import { Sparkles } from "lucide-react";
import { useImmersive } from "@/lib/ui-mode/useImmersive";

/**
 * "3D NEGA KO'RINMAYAPTI?" — kichik izoh va yoqish tugmasi.
 *
 * MUAMMO: foydalanuvchi "✨ 3D" ni tanlaydi, lekin qurilma sinovi
 * (kam xotira, trafik tejash, sekin internet...) sahnani o'chirib
 * qo'yadi. Ekranda esa faqat bo'sh joy qoladi va odam "sayt buzuq"
 * deb o'ylaydi — aynan shunday bo'lgan.
 *
 * Endi sabab OCHIQ yoziladi va oxirgi so'z foydalanuvchida: xohlasa
 * "Baribir yoqish" ni bosadi (tanlov saqlanadi). WebGL umuman
 * bo'lmasa tugma ko'rsatilmaydi — u yerda chizadigan narsa yo'q.
 */
export function Immersive3dNotice({ className = "" }: { className?: string }) {
  const { blocked, canForce, reasonText, setForced } = useImmersive();

  if (!blocked) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-navy-100/80 ${className}`}
    >
      <Sparkles size={14} className="text-aqua-300" aria-hidden />
      <span>
        3D sahna qurilmangizda o&apos;chirildi{reasonText ? ` — ${reasonText}` : ""}.
      </span>
      {canForce && (
        <button
          type="button"
          onClick={() => setForced(true)}
          className="rounded-full border border-aqua-500/50 px-2.5 py-0.5 font-semibold text-aqua-300 transition hover:bg-aqua-500/10"
        >
          Baribir yoqish
        </button>
      )}
    </div>
  );
}
