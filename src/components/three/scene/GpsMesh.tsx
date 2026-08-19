"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type Group, type Mesh } from "three";

/**
 * MINI XARITA — "GPS mesh".
 *
 * Do'kon joylashuvini ko'rsatadigan kichik sahna elementi: qiya
 * turgan simli to'r (wireframe), markazida yonib-o'chuvchi nuqta va
 * undan tarqaladigan halqa (radar to'lqini).
 *
 * Xarita RASM EMAS - hammasi geometriya: tashqi xarita xizmati ham,
 * API kaliti ham kerak emas va CSP buzilmaydi. Vazifasi ham shunga
 * yarasha: "biz shu yerdamiz va atrofga yetkazib beramiz" degan
 * hissiyot, aniq kartografiya emas.
 */

/** To'r o'lchami va zichligi. */
const SIZE = 2.2;
const DIVISIONS = 12;

export interface GpsMeshProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export function GpsMesh({
  position = [0, 0, 0],
  rotation = [-Math.PI / 2.6, 0, 0.28],
  scale = 1,
}: GpsMeshProps) {
  const group = useRef<Group>(null);
  const pulse = useRef<Mesh>(null);
  const dot = useRef<Mesh>(null);

  // Ranglar bir marta yasaladi (har kadrda yangi `Color` - keraksiz axlat).
  const colors = useMemo(() => ({ grid: new Color("#5E8CA6"), accent: new Color("#C49A6C") }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Radar to'lqini: 0 dan 1 gacha kattalashadi va so'nadi.
    const wave = (t % 2.6) / 2.6;
    if (pulse.current) {
      const s = 0.25 + wave * 1.15;
      pulse.current.scale.set(s, s, s);
      const material = pulse.current.material as { opacity: number };
      material.opacity = 0.5 * (1 - wave);
    }

    // Markaziy nuqta sekin "nafas oladi".
    if (dot.current) {
      const s = 1 + Math.sin(t * 2) * 0.12;
      dot.current.scale.set(s, s, s);
    }

    // Butun blok juda sekin tebranadi - qotib qolgandek ko'rinmasin.
    if (group.current) {
      group.current.position.y = position[1] + Math.sin(t * 0.5) * 0.08;
    }
  });

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      {/* Simli to'r - "xarita" ning o'zi. */}
      <gridHelper args={[SIZE, DIVISIONS, colors.accent, colors.grid]}>
        <meshBasicMaterial attach="material" transparent opacity={0.28} />
      </gridHelper>

      {/* To'r ostidagi mayin yorug'lik - to'r "havoda" turmasin. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[SIZE / 2, 40]} />
        <meshBasicMaterial color="#072D40" transparent opacity={0.35} depthWrite={false} />
      </mesh>

      {/* Radar to'lqini. */}
      <mesh ref={pulse} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.42, 0.46, 48]} />
        <meshBasicMaterial color={colors.accent} transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {/* Do'kon nuqtasi. */}
      <mesh ref={dot} position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshBasicMaterial color={colors.accent} toneMapped={false} />
      </mesh>
    </group>
  );
}
