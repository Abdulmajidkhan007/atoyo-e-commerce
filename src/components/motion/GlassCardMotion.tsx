"use client";

import { LazyMotion, m } from "framer-motion";

/**
 * GLASS KARTOCHKANING ANIMATSIYALI QISMI.
 *
 * Ataylab ALOHIDA fayl: `GlassCard` uni `next/dynamic` bilan chaqiradi,
 * shuning uchun klassik rejimdagi mijozga framer-motion ning bironta
 * bayti ham ketmaydi. `LazyMotion` esa paketning og'ir qismini
 * (`domAnimation`) yana bir pog'ona kechiktiradi.
 */
export default function GlassCardMotion({
  children,
  className,
  interactive,
}: {
  children: React.ReactNode;
  className: string;
  interactive: boolean;
}) {
  return (
    <LazyMotion features={() => import("framer-motion").then((mod) => mod.domAnimation)} strict>
      <m.div
        className={className}
        whileHover={interactive ? { y: -6, scale: 1.015 } : { y: -3 }}
        whileTap={interactive ? { scale: 0.99 } : undefined}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
