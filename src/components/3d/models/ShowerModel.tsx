"use client";

import { FinishMaterial, WaterStream } from "./parts";
import type { Finish } from "@/lib/three/finishes";

/** DUSH TIZIMI — ustun, egilgan bo'yin va dush kallagi. */
export function ShowerModel({ finish }: { finish: Finish }) {
  return (
    <group position={[0, -0.9, 0]}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.26, 0.3, 0.12, 32]} />
        <FinishMaterial finish={finish} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.075, 0.09, 2.05, 24]} />
        <FinishMaterial finish={finish} />
      </mesh>
      <mesh position={[0, 2.1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.3, 0.07, 16, 40, Math.PI / 2]} />
        <FinishMaterial finish={finish} />
      </mesh>
      {/* Dush kallagi */}
      <mesh position={[0, 2.05, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.3, 0.1, 40]} />
        <FinishMaterial finish={finish} />
      </mesh>
      <WaterStream position={[0, 1.35, 0.45]} height={1.3} radiusTop={0.24} radiusBottom={0.3} />
    </group>
  );
}
