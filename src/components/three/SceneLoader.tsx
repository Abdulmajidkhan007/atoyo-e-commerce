"use client";

/**
 * 3D SAHNA YUKLANAYOTGANDA ko'rinadigan minimal ko'rsatkich.
 *
 * Ataylab juda sodda: aylanuvchi halqa va bitta qator. Sahna
 * o'rnida "og'ir" skelet chizish ochilishni yanada sekin
 * ko'rsatadi, chunki bu qism baribir bir necha yuz millisekund.
 */
export function SceneLoader({ label = "3D sahna yuklanmoqda" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full w-full flex-col items-center justify-center gap-3"
    >
      <span className="h-9 w-9 animate-spin rounded-full border-2 border-aqua-500/30 border-t-aqua-500" />
      <span className="text-xs text-navy-300">{label}</span>
    </div>
  );
}
