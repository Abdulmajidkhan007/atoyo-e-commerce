"use client";

import Link from "next/link";
import { Button } from "@mui/material";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { useImmersive } from "@/lib/ui-mode/useImmersive";
import { useHeroScroll } from "@/lib/motion/useHeroScroll";
import { HeroCanvas } from "@/components/three/HeroCanvas";
import { SplitReveal } from "@/components/motion/SplitReveal";

/**
 * BOSH SAHIFA "HERO" BO'LIMI — ikki ko'rinishda.
 *
 * MAZMUN IKKALASIDA BIR XIL (sarlavha, matn, tugma), shuning uchun
 * SEO ham, ekran o'quvchi ham rejimga bog'liq emas. O'zgaradigani —
 * ko'rinish:
 *
 *   • KLASSIK: oddiy to'q fon, matn va tugma;
 *   • 3D: markazda premium mahsulot sahnasi, atrofida jonli
 *     ma'lumotli suzuvchi panellar, skroll bilan kamera sahnaga
 *     yaqinlashadi.
 *
 * SKROLL: kompyuterda bo'lim PIN qilinadi (sahifa joyida turadi,
 * kamera ichkariga kiradi), telefonda esa pin YO'Q — u yerda pin
 * skrollni "ushlab qolgandek" tuyuladi va xarid oqimini buzadi.
 */
export function Hero() {
  const { dict } = useI18n();
  const { immersive, tier } = useImmersive();

  // Pin faqat kompyuterda va faqat 3D rejimda.
  const { containerRef, progress } = useHeroScroll({
    enabled: immersive,
    pin: immersive && tier === "high",
  });

  return (
    <section
      ref={containerRef}
      className={`relative overflow-hidden ${
        immersive
          ? "bg-[radial-gradient(120%_120%_at_20%_0%,#0B3B54_0%,#072D40_45%,#04202F_100%)] text-white md:min-h-[86vh]"
          : "bg-navy-900 text-white"
      }`}
    >
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 pt-16 pb-8 md:pt-32 md:pb-24">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            immersive
              ? "border border-aqua-500/40 bg-aqua-500/10 text-aqua-300 backdrop-blur-xl"
              : "bg-aqua-500/20 text-aqua-300"
          }`}
        >
          {dict.home.badge}
        </span>

        {/* Sarlavha 3D rejimda so'zma-so'z, xiralikdan ochilib chiqadi. */}
        <SplitReveal
          text={dict.home.heroTitle}
          className="max-w-xl text-3xl font-bold md:text-5xl md:leading-tight"
        />
        <SplitReveal
          as="p"
          text={dict.home.heroText}
          delay={0.15}
          className="max-w-lg text-navy-100"
        />

        <Button component={Link} href="/katalog" variant="contained" color="primary" size="large">
          {dict.home.viewCatalog}
        </Button>
      </div>

      {/*
        3D QATLAMI — bosiladigan emas, faqat bezak.

        Telefonda matn OSTIDA, o'z bandida (oqim ichida). Kompyuterda
        o'ng tomonda 55% joyni egallaydi - matn chapda bemalol
        joylashadi. Ilgari u butun bo'limni qoplab, suzuvchi panellar
        sarlavha USTIGA tushib qolgan edi.
      */}
      <div
        aria-hidden
        data-immersive-only
        className="pointer-events-none relative h-64 w-full pb-6 md:absolute md:inset-y-0 md:right-0 md:h-full md:w-[55%] md:pb-0"
      >
        <HeroCanvas className="h-full w-full" progress={progress} />
      </div>
    </section>
  );
}
