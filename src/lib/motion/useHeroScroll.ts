"use client";

import { useEffect, useRef } from "react";

/**
 * KINEMATIK SKROLL — GSAP ScrollTrigger.
 *
 * Hero bo'limi skroll bilan "boshqariladi": progress 0 dan 1 gacha
 * o'sadi va kamera sahnaga yaqinlashadi (`CameraRig` o'qiydi).
 *
 * IKKI REJIM:
 *   • KOMPYUTER — hero PIN qilinadi: sahifa joyida qotib turadi,
 *     kamera esa ichkariga kirib boradi (to'liq kinematik);
 *   • TELEFON — pin YO'Q. Pin telefonda skrollni "ushlab qolgandek"
 *     tuyuladi va do'kon uchun bu xarid oqimini buzadi. Shu sabab
 *     u yerda progress oddiy skrolldan hisoblanadi.
 *
 * Progress REF orqali beriladi (state emas): skrollning har kadrida
 * React qayta render bo'lmaydi. Qo'shimcha ravishda qiymat CSS
 * o'zgaruvchisiga (`--hero-progress`) yoziladi - DOM qatlamlar ham
 * JS'siz unga qarab o'zgarishi mumkin.
 */

export interface HeroScroll {
  /** Hero bo'limiga biriktiriladigan ref (trigger). */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** 0..1 - `CameraRig` shundan o'qiydi. */
  progress: React.RefObject<number>;
}

export function useHeroScroll({ enabled, pin }: { enabled: boolean; pin: boolean }): HeroScroll {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progress = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);

        const trigger = ScrollTrigger.create({
          trigger: container,
          start: "top top",
          // Pin bo'lsa: bir yarim ekran davomida kamera kirib boradi.
          end: pin ? "+=140%" : "bottom top",
          pin,
          pinSpacing: pin,
          scrub: 0.8,
          onUpdate: (self) => {
            progress.current = self.progress;
            container.style.setProperty("--hero-progress", self.progress.toFixed(3));
          },
        });

        cleanup = () => trigger.kill();
      } catch {
        // GSAP yuklanmadi - sahna oddiy holatda qoladi (progress 0).
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled, pin]);

  return { containerRef, progress };
}
