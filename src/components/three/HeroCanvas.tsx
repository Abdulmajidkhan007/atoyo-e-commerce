"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, useState } from "react";
import { useImmersive } from "@/lib/ui-mode/useImmersive";
import { SceneLoader } from "./SceneLoader";

/**
 * 3D SAHNANING "DARVOZASI".
 *
 * Bu komponent uch ishni qiladi va shu sabab sahnaning o'zidan
 * ALOHIDA turadi (sahna faqat chizish bilan shug'ullanadi):
 *
 *   1) QAROR: og'ir sahna umuman chizilsinmi (`useImmersive` -
 *      foydalanuvchi 3D rejimni tanlagan va qurilma ko'taradi);
 *   2) YUKLASH: `three` va `@react-three/*` DINAMIK import qilinadi
 *      (`ssr: false`) - klassik rejimdagi mijoz bu ~600KB ni umuman
 *      yuklamaydi. Yuklanguncha `Suspense` + minimal loader;
 *   3) TEJASH: sahna ekrandan chiqib ketsa yoki brauzer varag'i
 *      orqaga o'tsa render TO'XTAYDI (`active = false`).
 *
 * 3D chizilmaydigan holatda o'rniga yengil gradient "poster"
 * ko'rinadi - joy bo'sh qolmaydi va sahifa "sakramaydi".
 */

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <SceneLoader />,
});

/** 3D o'rniga ko'rinadigan yengil variant (CSS gradient, 0 KB JS). */
function PosterFallback() {
  return (
    <div
      aria-hidden
      className="h-full w-full rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(196,154,108,0.55),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(94,140,166,0.45),transparent_55%)] blur-[2px]"
    />
  );
}

export function HeroCanvas({ className = "" }: { className?: string }) {
  const { immersive } = useImmersive();
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
          <HeroScene active={active} />
        </Suspense>
      ) : (
        <PosterFallback />
      )}
    </div>
  );
}
