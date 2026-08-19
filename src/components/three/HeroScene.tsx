"use client";

import type { RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { ProductShowpiece } from "./scene/ProductShowpiece";
import { FloatingPanel } from "./scene/FloatingPanel";
import { CameraRig } from "./scene/CameraRig";
import { GpsMesh } from "./scene/GpsMesh";
import type { HeroPanels } from "@/lib/hero/usePanelData";
import type { FinishId } from "@/lib/three/finishes";

/**
 * HERO SAHNASI — "luxury product shot".
 *
 * Tuzilishi ATAYLAB sodda: bu fayl faqat SAHNANI YIG'ADI, hech
 * qanday qaror qabul qilmaydi. Qaror (chizilsinmi, qaysi sifatda)
 * `HeroCanvas` da, kamera mantiqi `CameraRig` da, shakllar
 * `ProductShowpiece` da, panellar `FloatingPanel` da.
 *
 * TASHQI FAYL YO'Q: model ham (`.glb`), muhit xaritasi ham (`.hdr`)
 * yuklanmaydi — CSP tashqi hostni bloklaydi. Yorug'lik `Lightformer`
 * plitalari bilan xotirada quriladi, matn esa canvas-teksturada.
 *
 * `quality`:
 *   • `"high"` (kompyuter) — soya, yuqori piksel zichligi, to'liq muhit;
 *   • `"mid"`  (telefon)   — soyasiz, past zichlik, yorug'lik kuchliroq.
 */

const GOLD = "#C49A6C";

export interface HeroSceneProps {
  /** Sahna ko'rinib turibdimi (yo'q bo'lsa render to'xtaydi). */
  active: boolean;
  /** Skroll progressi (GSAP yozadi, `CameraRig` o'qiydi). */
  progress: RefObject<number>;
  /** Suzuvchi panellardagi JONLI ma'lumot. */
  panels: HeroPanels;
  /** Mahsulot qoplamasi - mijoz hero'da tanlaydi. */
  finishId?: FinishId;
  quality?: "mid" | "high";
}

export default function HeroScene({
  active,
  progress,
  panels,
  finishId = "gold",
  quality = "high",
}: HeroSceneProps) {
  const light = quality === "mid";

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={light ? [1, 1.25] : [1, 2]}
      camera={{ position: [3.1, 2.0, 5.6], fov: 38 }}
      gl={{
        antialias: !light,
        alpha: true,
        powerPreference: "high-performance",
      }}
      style={{ pointerEvents: "none" }}
    >
      <CameraRig progress={progress} compact={light} />

      <ambientLight intensity={light ? 0.75 : 0.45} />
      <directionalLight position={[4, 6, 4]} intensity={light ? 2.2 : 1.7} />
      <pointLight position={[-4, 1, 3]} intensity={28} color={GOLD} distance={14} />

      <ProductShowpiece compact={light} finishId={finishId} />

      {/*
        SUZUVCHI PANELLAR — turli CHUQURLIKDA (Z), shuning uchun kamera
        yaqinlashganda ular bir-biridan ajralib, yonidan o'tib ketadi.
        Telefonda ikkitasi qoladi: uchtasi kadrga sig'maydi.

        JOYLASHUV KADRGA QARAB HISOBLANGAN. Kompyuterda kanvas
        bo'limning o'ng 55% ini egallaydi; fov 38° va masofa ~6.5
        bo'lganda ko'rinadigan kenglik ~4.2 birlik, ya'ni x chegarasi
        taxminan ±2.1. Kengligi 2.1 bo'lgan panel markazi -1.05 dan
        chapda bo'lsa CHETDAN CHIQIB ketadi - ilgari aynan shunday
        bo'lgan va matnning yarmi ko'rinmasdi.
      */}
      <FloatingPanel
        panel={panels.delivery}
        position={light ? [-0.9, 1.3, 0.6] : [-0.9, 1.55, 0.9]}
        rotation={[0, 0.4, 0]}
        width={light ? 1.9 : 2.1}
        phase={0}
      />
      <FloatingPanel
        panel={panels.catalog}
        position={light ? [0.95, -1.6, 0.7] : [1.02, 0.62, -0.3]}
        rotation={[0, -0.42, 0]}
        width={light ? 1.9 : 2.0}
        speed={0.42}
        phase={1.9}
      />
      {!light && (
        <FloatingPanel
          panel={panels.product}
          position={[-0.82, -1.62, 1.3]}
          rotation={[0, 0.28, 0]}
          width={1.9}
          speed={0.62}
          phase={3.4}
        />
      )}

      {/* Mini xarita: do'kon nuqtasi va undan tarqaladigan radar
          to'lqini ("15 km atrofga yetkazamiz" degan hissiyot).
          Telefonda kadr tor - u yerda chizilmaydi. */}
      {!light && <GpsMesh position={[1.28, -1.5, 0.95]} scale={0.68} />}

      {!light && (
        <ContactShadows position={[0, -1.02, 0]} opacity={0.42} scale={11} blur={2.4} far={4.5} />
      )}

      <Environment resolution={light ? 64 : 160}>
        <Lightformer
          intensity={light ? 3.4 : 2.4}
          position={[0, 4, 2]}
          scale={[9, 2, 1]}
          color="#ffffff"
        />
        <Lightformer
          intensity={light ? 2.2 : 1.6}
          position={[-5, 1, 2]}
          scale={[5, 5, 1]}
          color={GOLD}
        />
        <Lightformer
          intensity={light ? 1.7 : 1.2}
          position={[5, -1, 1]}
          scale={[5, 5, 1]}
          color="#5E8CA6"
        />
      </Environment>
    </Canvas>
  );
}
