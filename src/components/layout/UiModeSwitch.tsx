"use client";

import { Sparkles, FileText } from "lucide-react";
import { useUiMode } from "@/lib/ui-mode/UiModeContext";
import type { UiMode } from "@/lib/ui-mode/config";

/**
 * DIZAYN ALMASHTIRGICH — "✨ 3D" / "📄 Klassik".
 *
 * Ko'rinishi: ikkita tugma va ularning orqasida SURILADIGAN yostiq
 * (mahsulot sahifasidagi tur tanlagichdagi kabi). Yostiq CSS
 * `transform` bilan suriladi - bu yerda GSAP ham, framer-motion ham
 * KERAK EMAS: tugma klassik rejimda ham ko'rinadi, ya'ni og'ir
 * kutubxona yuklanmasligi kerak.
 */

const OPTIONS: { mode: UiMode; label: string; Icon: typeof Sparkles }[] = [
  { mode: "3d-modern", label: "3D", Icon: Sparkles },
  { mode: "classic", label: "Klassik", Icon: FileText },
];

export function UiModeSwitch({ className = "" }: { className?: string }) {
  const { mode, setMode } = useUiMode();
  const activeIndex = OPTIONS.findIndex((option) => option.mode === mode);

  return (
    <div
      role="radiogroup"
      aria-label="Dizayn rejimi"
      className={`relative flex items-center rounded-full border border-navy-100 bg-white/70 p-0.5 backdrop-blur dark:border-navy-500 dark:bg-navy-800/70 ${className}`}
    >
      {/* Suriladigan yostiq - tugmalarning ORQASIDA (matn ustiga chiqmaydi). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-aqua-500 transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />

      {OPTIONS.map(({ mode: option, label, Icon }) => {
        const isActive = option === mode;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setMode(option)}
            title={option === "3d-modern" ? "Yangi 3D dizayn" : "Klassik (yengil) dizayn"}
            className={`relative z-10 flex w-1/2 min-w-[68px] items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              isActive ? "text-white" : "text-navy-500 dark:text-navy-100"
            }`}
          >
            <Icon size={14} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
