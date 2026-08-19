"use client";

import { CeramicMaterial, FinishMaterial } from "./parts";
import type { Finish } from "@/lib/three/finishes";

/** UNITAZ — keramika korpus + qoplama rangidagi tugma. */
export function ToiletModel({ finish }: { finish: Finish }) {
  return (
    <group position={[0, -0.8, 0]}>
      {/* Tag */}
      <mesh position={[0, 0.35, 0.05]}>
        <cylinderGeometry args={[0.45, 0.38, 0.7, 32]} />
        <CeramicMaterial />
      </mesh>
      {/* Kosa */}
      <mesh position={[0, 0.78, 0.12]} scale={[1, 0.55, 1.2]}>
        <sphereGeometry args={[0.52, 40, 24]} />
        <CeramicMaterial />
      </mesh>
      {/* Jiyak */}
      <mesh position={[0, 0.98, 0.12]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.2, 1]}>
        <torusGeometry args={[0.5, 0.05, 16, 48]} />
        <CeramicMaterial color="#FFFFFF" />
      </mesh>
      {/* Bachok */}
      <mesh position={[0, 1.15, -0.52]}>
        <boxGeometry args={[0.85, 0.9, 0.34]} />
        <CeramicMaterial />
      </mesh>
      {/* Tugma - qoplama rangida */}
      <mesh position={[0, 1.62, -0.52]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.05, 24]} />
        <FinishMaterial finish={finish} />
      </mesh>
    </group>
  );
}
