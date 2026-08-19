"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { useImmersive } from "@/lib/ui-mode/useImmersive";
import { useHeroPanels } from "@/lib/hero/usePanelData";
import { SceneLoader } from "./SceneLoader";

/**
 * 3D SAHNANING "DARVOZASI".
 *
 * Bu komponent qaror qabul qiladi, sahna esa faqat chizadi:
 *
 *   1) QAROR: og'ir sahna umuman chizilsinmi (`useImmersive` -
 *      foydalanuvchi 3D rejimni tanlagan va qurilma ko'taradi);
 *   2) YUKLASH: `three` va `@react-three/*` DINAMIK import qilinadi
 *      (`ssr: false`) - klassik rejimdagi mijoz bu ~600KB ni umuman
 *      yuklamaydi. Yuklanguncha `Suspense` + minimal loader;
 *   3) TEJASH: sahna ekrandan chiqib ketsa yoki brauzer varag'i
 *      orqaga o'tsa render TO'XTAYDI (`active = false`);
 *   4) MA'LUMOT: suzuvchi panellarga jonli ma'lumot beradi
 *      (kategoriyalar, yetkazish va'dasi, vitrinadagi mahsulot).
 *
 * 3D chizilmaydigan holatda o'rniga sezilmas yorug'lik qoladi.
 */

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <SceneLoader />,
});

/** 3D chizilmasa - shunchaki mayin yorug'lik (0 KB JS). */
function PosterFallback() {
  return (
    <div
      aria-hidden
      className="h-full w-full bg-[radial-gradient(circle_at_60%_45%,rgba(196,154,108,0.18),transparent_58%)]"
    />
  );
}

export interface HeroCanvasProps {
  className?: string;
  /** Skroll progressi (0..1) - `useHeroScroll` yozadi. */
  progress: RefObject<number>;
}

export function HeroCanvas({ className = "", progress }: HeroCanvasProps) {
  const { immersive, tier } = useImmersive();
  const panels = useHeroPanels();
  const wrapper = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  // Ko'rinish + varaq holati: ikkalasi ham "ha" bo'lsagina chiziladi.
  useEffect(() => {
    if (!immersive) return;
    const element = wrapper.current;
    if (!element) return;

    let onScreen = false;
    const sync = () => setActive(onScreen && document.visibilityState === "visible");

    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((entry) => entry.isIntersecting);
        sync();
      },
      { rootMargin: "100px" }
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [immersive]);

  return (
    <div ref={wrapper} className={className}>
      {immersive ? (
        <Suspense fallback={<SceneLoader />}>
          <HeroScene
            active={active}
            progress={progress}
            panels={panels}
            quality={tier === "high" ? "high" : "mid"}
          />
        </Suspense>
      ) : (
        <PosterFallback />
      )}
    </div>
  );
}
