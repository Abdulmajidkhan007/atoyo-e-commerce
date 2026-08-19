"use client";

import { Suspense, lazy } from "react";
import { useImmersive } from "@/lib/ui-mode/useImmersive";

/**
 * KARTOCHKA — ikki ko'rinishda.
 *
 *   • KLASSIK: hozirgi oq/navy kartochka. Hech qanday animatsiya
 *     kutubxonasi YUKLANMAYDI;
 *   • 3D REJIM: glassmorphism (shaffof fon + `backdrop-blur`, nozik
 *     chegara) va sichqoncha tekkanda mayin ko'tarilish.
 *
 * Animatsiyali variant alohida faylda va KECHIKTIRIB yuklanadi
 * (`lazy` + `Suspense`) - shu tufayli klassik rejim avvalgidek
 * yengil qoladi. Yuklanish paytida `Suspense` fallback'i AYNI o'sha
 * kartani (faqat animatsiyasiz) chizadi, ya'ni kontent bir lahza ham
 * yo'qolmaydi va sahifa "sakramaydi".
 */

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** Karta bosiladigan bo'lsa hover kuchliroq va bosilish effekti bor. */
  interactive?: boolean;
}

/** Ikkala rejimda umumiy asos (o'lcham, radius, ichki bo'shliq). */
const BASE = "rounded-xl2 border p-4 transition-colors";
const CLASSIC = "border-navy-100 bg-white dark:border-navy-500 dark:bg-navy-700";
const GLASS =
  "border-navy-100/80 bg-white/55 backdrop-blur-md shadow-[0_8px_32px_rgba(7,45,64,0.12)] dark:border-white/10 dark:bg-navy-800/50";

const GlassCardMotion = lazy(() => import("./GlassCardMotion"));

export function GlassCard({ children, className = "", interactive = false }: GlassCardProps) {
  const { immersive } = useImmersive();

  if (!immersive) {
    return <div className={`${BASE} ${CLASSIC} ${className}`}>{children}</div>;
  }

  const glassClass = `${BASE} ${GLASS} ${className}`;
  return (
    <Suspense fallback={<div className={glassClass}>{children}</div>}>
      <GlassCardMotion className={glassClass} interactive={interactive}>
        {children}
      </GlassCardMotion>
    </Suspense>
  );
}
