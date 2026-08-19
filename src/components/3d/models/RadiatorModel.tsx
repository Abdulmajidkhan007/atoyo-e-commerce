"use client";

import { useMemo } from "react";
import { FinishMaterial, SteelMaterial } from "./parts";
import type { Finish } from "@/lib/three/finishes";

/** RADIATOR — qovurg'alar qatori + yuqori/quyi kollektorlar. */
export function RadiatorModel({ finish, fins = 7 }: { finish: Finish; fins?: number }) {
  const items = useMemo(() => Array.from({ length: fins }, (_, index) => index), [fins]);
  const step = 0.26;
  const width = (fins - 1) * step;

  return (
    <group position={[0, -0.1, 0]}>
      {items.map((index) => (
        <mesh key={index} position={[index * step - width / 2, 0, 0]}>
          <boxGeometry args={[0.15, 1.5, 0.42]} />
          <FinishMaterial finish={finish} />
        </mesh>
      ))}
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[width + 0.35, 0.16, 0.42]} />
        <FinishMaterial finish={finish} />
      </mesh>
      <mesh position={[0, -0.82, 0]}>
        <boxGeometry args={[width + 0.35, 0.16, 0.42]} />
        <FinishMaterial finish={finish} />
      </mesh>
      {/* Ulanish quvuri */}
      <mesh position={[width / 2 + 0.3, -0.82, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.35, 20]} />
        <SteelMaterial />
      </mesh>
    </group>
  );
}
