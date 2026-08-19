"use client";

import { WaterStream, FinishMaterial, SteelMaterial } from "./parts";
import type { Finish } from "@/lib/three/finishes";

/**
 * KRAN (gooseneck smesitel) — parametrik model.
 *
 * `.glb` fayl kerak emas: shakl koddan quriladi, shuning uchun
 * yuklanish tez va qoplama (xrom/tillarang/mat qora) darhol
 * almashadi. Barcha metall yuzalar `FinishMaterial` dan foydalanadi.
 */
export function FaucetModel({ finish, water = true }: { finish: Finish; water?: boolean }) {
  return (
    <group position={[0, -0.75, 0]}>
      {/* Tag */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.24, 0.28, 0.1, 40]} />
        <FinishMaterial finish={finish} />
      </mesh>

      {/* Ustun */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.095, 0.12, 1.28, 32]} />
        <FinishMaterial finish={finish} />
      </mesh>

      {/* Bo'yin: yarim halqa (YZ tekisligida - oldinga engashadi) */}
      <mesh position={[0, 1.36, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.36, 0.09, 20, 56, Math.PI]} />
        <FinishMaterial finish={finish} />
      </mesh>

      {/* Jo'mrak uchi */}
      <mesh position={[0, 1.3, 0.72]}>
        <cylinderGeometry args={[0.07, 0.085, 0.22, 24]} />
        <FinishMaterial finish={finish} />
      </mesh>

      {/* Dastak */}
      <mesh position={[0.2, 1.12, -0.06]} rotation={[0.2, 0, -0.7]}>
        <cylinderGeometry args={[0.03, 0.03, 0.34, 16]} />
        <SteelMaterial />
      </mesh>
      <mesh position={[0.07, 1.05, -0.02]}>
        <sphereGeometry args={[0.065, 20, 20]} />
        <FinishMaterial finish={finish} />
      </mesh>

      {water && <WaterStream position={[0, 0.78, 0.72]} height={0.8} />}
    </group>
  );
}
