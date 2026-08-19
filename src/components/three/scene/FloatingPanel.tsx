"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import { createPanelTexture } from "./panelTexture";
import type { HeroPanel } from "@/lib/hero/usePanelData";

/**
 * SAHNA ICHIDA SUZUVCHI SHISHA PANEL.
 *
 * Panel DOM emas, HAQIQIY 3D obyekt: kamera aylanganda u ham
 * aylanadi, chuqurlik (Z) haqiqiy, mahsulot uni to'sib ham qoladi.
 * Matn `panelTexture.ts` da chizilgan (tashqi shrift faylsiz).
 *
 * Har panel o'z ritmida "nafas oladi" — `useFrame` ichida sinus
 * bilan: bu framer-motion'dan farqli o'laroq GPU vaqtida ishlaydi va
 * qo'shimcha React renderi bermaydi.
 */

export interface FloatingPanelProps {
  panel: HeroPanel;
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Panel kengligi (dunyo birligida). Balandligi 2:1 nisbatda. */
  width?: number;
  /** "Nafas" tezligi va amplitudasi - panellar bir vaqtda qimirlamasin. */
  speed?: number;
  amplitude?: number;
  /** Faza - har panel boshqa lahzada ko'tariladi. */
  phase?: number;
}

export function FloatingPanel({
  panel,
  position,
  rotation = [0, 0, 0],
  width = 2.1,
  speed = 0.55,
  amplitude = 0.13,
  phase = 0,
}: FloatingPanelProps) {
  const group = useRef<Group>(null);
  const height = width / 2;

  // Tekstura panel matni o'zgargandagina qayta chiziladi.
  const texture = useMemo(() => createPanelTexture(panel), [panel]);

  // Tekstura GPU xotirasini egallaydi - komponent olib tashlanganda
  // bo'shatiladi (aks holda rejim almashtirilganda sekin "oqib" ketadi).
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((state) => {
    const node = group.current;
    if (!node) return;
    const t = state.clock.elapsedTime * speed + phase;
    node.position.y = position[1] + Math.sin(t) * amplitude;
    // Juda mayin qiyalik - panel "suzayotgandek" tuyuladi.
    node.rotation.z = MathUtils.lerp(node.rotation.z, Math.sin(t * 0.7) * 0.02, 0.08);
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
      {/* BITTA tekislik yetarli: shu'la ham, shisha fon ham, matn ham
          bitta teksturada chizilgan. Ilgari shu'la uchun alohida
          tekislik bor edi va u kadrda katta kulrang to'rtburchak
          bo'lib ko'rinardi. */}
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
