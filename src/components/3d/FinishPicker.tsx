"use client";

import { FINISHES, type Finish, type FinishId } from "@/lib/three/finishes";

/**
 * QOPLAMA TANLAGICH — suzuvchi shisha panel.
 *
 * Bitta komponent ikki joyda ishlatiladi: bosh sahifadagi hero'da va
 * mahsulot sahifasidagi konfiguratorda. Shu sabab ko'rinish ham,
 * xatti-harakat ham bir xil - mijoz "boshqa sayt"ga tushib qolgandek
 * bo'lmaydi.
 */
export function FinishPicker({
  value,
  onChange,
  className = "",
}: {
  value: FinishId;
  onChange: (finish: Finish) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Qoplama"
      className={`flex max-w-full gap-1.5 overflow-x-auto rounded-full border border-white/15 bg-white/10 p-1.5 backdrop-blur-xl ${className}`}
    >
      {FINISHES.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(item)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition duration-300 ${
              active
                ? "scale-105 bg-white/15 text-white shadow-md ring-2 ring-aqua-500"
                : "text-navy-100 hover:bg-white/10"
            }`}
          >
            <span
              aria-hidden
              className="h-4 w-4 shrink-0 rounded-full border border-white/40"
              style={{ background: item.gradient }}
            />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
