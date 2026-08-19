"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useImmersive } from "@/lib/ui-mode/useImmersive";
import { stationForPath } from "@/lib/world/stations";
import { DEFAULT_FINISH } from "@/lib/three/finishes";

/**
 * 3D DUNYONING "DARVOZASI" — sayt karkasiga bir marta o'rnatiladi.
 *
 * Vazifalari:
 *   1) QAROR: dunyo umuman chizilsinmi (`useImmersive` + manzil).
 *      Bosh sahifada chizilmaydi - u yerda o'zining kinematik hero
 *      sahnasi bor; admin va `/tv` da ham chizilmaydi;
 *   2) YUKLASH: sahna dinamik import bilan (`ssr: false`) - klassik
 *      rejimdagi mijoz uni umuman yuklamaydi;
 *   3) TEJASH: varaq orqaga o'tsa render to'xtaydi.
 *
 * Kanvas EKRAN ORTIDA turadi (`fixed inset-0 -z-10`) va bosilmaydi:
 * butun kontent - matn, narx, havolalar - odatdagi HTML'da qoladi.
 */

const WorldScene = dynamic(() => import("./WorldScene"), { ssr: false });

export function WorldCanvas() {
  const { immersive, tier } = useImmersive();
  const pathname = usePathname();
  const station = stationForPath(pathname ?? "/");
  const [visible, setVisible] = useState(true);

  // Varaq orqaga o'tsa GPU bo'shatiladi.
  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  if (!immersive || !station) return null;

  /**
   * TELEFONDA MAHSULOT SAHIFASIDA dunyo chizilmaydi: u yerda
   * sahifaning O'ZIDA konfigurator kanvasi bor va ikkita WebGL
   * sahnasini bir vaqtda ushlab turish telefonni qizdiradi.
   * Kompyuterda ikkalasi ham bemalol ishlaydi.
   */
  if (station.content === "spotlight" && tier !== "high") return null;

  return (
    <div
      aria-hidden
      data-immersive-only
      className="pointer-events-none fixed inset-0 -z-10 [&>canvas]:!absolute [&>canvas]:!inset-0"
    >
      <Suspense fallback={null}>
        <WorldScene
          station={station}
          active={visible}
          finish={DEFAULT_FINISH}
          quality={tier === "high" ? "high" : "mid"}
        />
      </Suspense>

      {/* MAYIN PARDA — kanvasdan KEYIN (ya'ni uning USTIDA).
          Dunyo kontent ortida turadi va matn kontrasti har sahifada
          bir xil qolishi kerak: pardasiz oq matn yorqin metall ustiga
          tushib o'qilmay qolardi. */}
      <div className="absolute inset-0 bg-navy-950/55" />
    </div>
  );
}
