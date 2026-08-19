"use client";

import { useEffect, useRef, useState } from "react";
import { useImmersive } from "@/lib/ui-mode/useImmersive";

/**
 * MATNNING SO'ZMA-SO'Z OCHILISHI (kinematik sarlavha).
 *
 * 3D rejimda har bir so'z ketma-ket, xiralikdan (blur) aniqlikka
 * o'tib chiqadi - GSAP `stagger` bilan. Klassik rejimda esa matn
 * oddiy holda turadi: hech qanday kutubxona yuklanmaydi.
 *
 * MUHIM: matn HAR DOIM to'liq HTML'da bo'ladi (so'zlar `<span>` lar
 * ichida) - ya'ni Google ham, ekran o'quvchi ham uni o'qiydi.
 * Animatsiya faqat ko'rinishni o'zgartiradi.
 *
 * NOZIK JOY: boshlang'ich "yashirin" holat JSX'dagi `style` bilan
 * emas, CSS orqali beriladi (`globals.css` dagi `[data-split="on"]`).
 * Sabab: ota komponent qayta render bo'lsa (masalan panel ma'lumoti
 * kelganda) React `style` ni QAYTA qo'yardi va GSAP chiqargan matn
 * yana yo'qolib qolardi. Inline uslub GSAP'niki - u CSS'dan ustun.
 */
export function SplitReveal({
  text,
  className = "",
  as: Tag = "h1",
  delay = 0,
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "p";
  delay?: number;
}) {
  const { immersive } = useImmersive();
  const ref = useRef<HTMLElement | null>(null);
  /** `true` - animatsiya ishlamadi, matn oddiy holda ko'rsatiladi. */
  const [plain, setPlain] = useState(false);
  const words = text.split(" ");
  const animated = immersive && !plain;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Klassik rejim: matn shundoq turadi, animatsiya qurilmaydi.
    if (!immersive) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      try {
        const { gsap } = await import("gsap");
        if (cancelled || !ref.current) return;
        const targets = ref.current.querySelectorAll("[data-word]");
        const animation = gsap.to(targets, {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.85,
          delay,
          ease: "power3.out",
          stagger: 0.06,
        });
        cleanup = () => animation.kill();
      } catch {
        // GSAP kelmadi - matn baribir ko'rinsin.
        if (!cancelled) setPlain(true);
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [immersive, delay]);

  return (
    <Tag ref={ref as React.Ref<never>} className={className} data-split={animated ? "on" : "off"}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          data-word
          className="inline-block will-change-[transform,opacity,filter]"
        >
          {word}
          {index < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}
