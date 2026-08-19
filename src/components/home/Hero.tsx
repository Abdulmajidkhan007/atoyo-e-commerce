"use client";

import Link from "next/link";
import { Button } from "@mui/material";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { useImmersive } from "@/lib/ui-mode/useImmersive";
import { HeroCanvas } from "@/components/three/HeroCanvas";

/**
 * BOSH SAHIFA "HERO" BO'LIMI.
 *
 * Matn, tugma va tuzilma IKKALA rejimda ham BIR XIL - o'zgaradigani
 * faqat ko'rinish. Shu sabab SEO ham, ekran o'quvchi (screen reader)
 * ham rejimga bog'liq emas: 3D qism butunlay bezak
 * (`aria-hidden`, `pointer-events: none`).
 */
export function Hero() {
  const { dict } = useI18n();
  const { immersive } = useImmersive();

  return (
    <section
      className={`relative overflow-hidden ${
        immersive
          ? "bg-[radial-gradient(120%_120%_at_20%_0%,#0B3B54_0%,#072D40_45%,#04202F_100%)] text-white"
          : "bg-navy-900 text-white"
      }`}
    >
      {/* 3D qatlami: matn ORQASIDA turadi va bosilmaydi. */}
      <div
        aria-hidden
        data-immersive-only
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 md:block"
      >
        <HeroCanvas className="h-full w-full" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-16 md:py-24">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            immersive
              ? "border border-aqua-500/40 bg-aqua-500/15 text-aqua-300 backdrop-blur"
              : "bg-aqua-500/20 text-aqua-300"
          }`}
        >
          {dict.home.badge}
        </span>

        <h1 className="max-w-xl text-3xl font-bold md:text-5xl md:leading-tight">
          {dict.home.heroTitle}
        </h1>
        <p className="max-w-lg text-navy-100">{dict.home.heroText}</p>

        <Button component={Link} href="/katalog" variant="contained" color="primary" size="large">
          {dict.home.viewCatalog}
        </Button>
      </div>
    </section>
  );
}
