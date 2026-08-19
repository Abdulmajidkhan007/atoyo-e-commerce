"use client";

import { BackSide } from "three";
import { CeramicMaterial, FinishMaterial, SteelMaterial, WaterStream } from "./parts";
import { FaucetModel } from "./FaucetModel";
import type { Finish } from "@/lib/three/finishes";

/**
 * MOYKA / RAKOVINA — plita ustidagi kosa (vessel) va kran.
 *
 * Kosa ATAYLAB plita USTIDA: plita ichiga solingan kosa yuqoridan
 * qaraganda ko'rinmaydi (plita to'la jism) va mahsulot "taxta" bo'lib
 * chiqadi - bir marta shunday bo'lgan.
 */
export function SinkModel({ finish, ceramic = false }: { finish: Finish; ceramic?: boolean }) {
  const radius = 0.6;

  return (
    <group>
      {/* Plita */}
      <mesh position={[0, -0.82, 0]}>
        <boxGeometry args={[2.4, 0.12, 1.4]} />
        <meshStandardMaterial color="#0A3348" roughness={0.45} metalness={0.3} />
      </mesh>

      {/* Kosa: tashqi va ichki yuza (ichkarisi ko'rinishi uchun) */}
      <group position={[0, -0.2, 0.05]}>
        <mesh>
          <sphereGeometry args={[radius, 56, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          {ceramic ? <CeramicMaterial /> : <FinishMaterial finish={finish} />}
        </mesh>
        <mesh>
          <sphereGeometry args={[radius - 0.03, 56, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          {ceramic ? (
            <meshStandardMaterial color="#E4ECF2" metalness={0.05} roughness={0.4} side={BackSide} />
          ) : (
            <meshStandardMaterial color="#93B4C6" metalness={1} roughness={0.24} side={BackSide} />
          )}
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius - 0.015, 0.03, 16, 72]} />
          {ceramic ? <CeramicMaterial /> : <SteelMaterial />}
        </mesh>
        {/* Suv teshigi */}
        <mesh position={[0, -radius + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.035, 0.07, 24]} />
          <FinishMaterial finish={finish} />
        </mesh>
      </group>

      {/* Kran orqada */}
      <group position={[0, -0.05, -0.6]} scale={0.8}>
        <FaucetModel finish={finish} water={false} />
      </group>

      <WaterStream position={[0, 0.02, 0.06]} height={0.78} />
    </group>
  );
}
