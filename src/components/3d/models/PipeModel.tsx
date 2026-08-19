"use client";

import { FinishMaterial } from "./parts";
import type { Finish } from "@/lib/three/finishes";

/** QUVUR VA MUFTA — burchak birikma (elbow). */
export function PipeModel({ finish }: { finish: Finish }) {
  return (
    <group rotation={[0.1, 0.4, 0]}>
      <mesh>
        <torusGeometry args={[0.9, 0.26, 24, 48, Math.PI / 2]} />
        <FinishMaterial finish={finish} />
      </mesh>
      <mesh position={[0.9, -0.5, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 1, 24]} />
        <FinishMaterial finish={finish} />
      </mesh>
      <mesh position={[-0.5, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.26, 1, 24]} />
        <FinishMaterial finish={finish} />
      </mesh>
      {/* Gayka halqalari */}
      <mesh position={[0.9, -0.95, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.16, 6]} />
        <FinishMaterial finish={finish} />
      </mesh>
      <mesh position={[-0.95, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.32, 0.32, 0.16, 6]} />
        <FinishMaterial finish={finish} />
      </mesh>
    </group>
  );
}
