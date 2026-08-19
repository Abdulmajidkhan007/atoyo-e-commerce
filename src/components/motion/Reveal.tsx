"use client";

import { useEffect, useRef, useState } from "react";
import { useImmersive } from "@/lib/ui-mode/useImmersive";

/**
 * SKROLLDA CHIROYLI CHIQISH (fade-up).
 *
 * Ikki yo'l bor va ikkalasi ham bir xil natijani beradi:
 *
 *   • 3D rejim + quvvatli qurilma → GSAP ScrollTrigger (silliq, `scale`
 *     bilan). GSAP DINAMIK import qilinadi: klassik rejimdagi mijoz
 *     uni umuman yuklamaydi;
 *   • qolgan hollarda → IntersectionObserver + CSS transition. Bu
 *     deyarli "bepul" va hech qanday kutubxona talab qilmaydi.
 *
 * Har ikki holatda ham element boshida biroz pastda va shaffof
 * turadi. JS umuman ishlamasa (eski brauzer, JS o'chirilgan bot)
 * blok ko'rinmay qolmasligi uchun `layout.tsx` dagi `<noscript>`
 * uslubi `[data-reveal]` ni darhol ko'rinadigan qiladi - shu sabab
 * quyidagi atribut MAJBURIY.
 */

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Kechikish (soniya) - bir necha element ketma-ket chiqishi uchun. */
  delay?: number;
  /** HTML tegi (bo'lim uchun `section`, karta uchun `div`). */
  as?: "div" | "section" | "li";
}

export function Reveal({ children, className = "", delay = 0, as = "div" }: RevealProps) {
  const { immersive } = useImmersive();
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // --- Yengil yo'l: kuzatuvchi + CSS ---
    if (!immersive) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setVisible(true);
            observer.disconnect();
          }
        },
        { rootMargin: "0px 0px -10% 0px" }
      );
      observer.observe(element);
      return () => observer.disconnect();
    }

    // --- Boy yo'l: GSAP ScrollTrigger (faqat 3D rejimda yuklanadi) ---
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (cancelled || !ref.current) return;

        gsap.registerPlugin(ScrollTrigger);
        // `to` (fromTo emas): element allaqachon shaffof va pastda
        // turibdi, shuning uchun "ko'rindi-yo'qoldi-yana ko'rindi"
        // degan sakrash bo'lmaydi.
        const animation = gsap.to(ref.current, {
          opacity: 1,
          y: 0,
          scale: 1,
          // Qatlamli blur: element "fokusga kelayotgandek" ochiladi.
          filter: "blur(0px)",
          duration: 0.7,
          delay,
          ease: "power2.out",
          scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
        });

        cleanup = () => {
          animation.scrollTrigger?.kill();
          animation.kill();
        };
      } catch {
        // GSAP yuklanmadi (tarmoq uzildi) - kontent baribir ko'rinsin.
        if (!cancelled) setVisible(true);
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [immersive, delay]);

  const Tag = as;
  // Boshlang'ich holat IKKALA yo'lda bir xil: biroz pastda va shaffof.
  // Yengil yo'lda uni CSS transition ko'taradi, 3D rejimda GSAP -
  // GSAP inline uslub yozgani uchun bu klasslar ustidan ishlaydi.
  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-reveal
      className={`${
        immersive
          // Blur boshlang'ich holat sifatida turadi; GSAP uni inline
          // uslub bilan olib tashlaydi (inline CSS klassdan ustun).
          // GSAP umuman kelmasa `visible` bo'ladi va klass olinadi.
          ? visible
            ? ""
            : "blur-[6px]"
          : "transition-all duration-700 ease-out"
      } ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"} ${className}`}
      style={immersive ? undefined : { transitionDelay: `${delay}s` }}
    >
      {children}
    </Tag>
  );
}
