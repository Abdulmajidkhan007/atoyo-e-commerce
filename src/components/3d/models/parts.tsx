"use client";

import { finishMaterialProps, type Finish } from "@/lib/three/finishes";

/**
 * MODEL QISMLARI — hamma parametrik model shulardan yig'iladi.
 *
 * Nega alohida fayl? Kran ham, dush ham, radiator ham bir xil
 * "til"da gapirishi kerak: bir xil metall, bir xil qalinlik hissi.
 * Ilgari har model o'z materialini yozganda ular boshqa-boshqa
 * ko'rinardi.
 */

/** Asosiy (qoplama beriladigan) metall material. */
export function FinishMaterial({ finish }: { finish: Finish }) {
  return <meshStandardMaterial {...finishMaterialProps(finish)} envMapIntensity={1.15} />;
}

/** Qo'shimcha detallar uchun sayqallangan po'lat (qoplamaga bog'liq emas). */
export function SteelMaterial({ color = "#DCE9F1", roughness = 0.16 }) {
  return <meshStandardMaterial color={color} metalness={1} roughness={roughness} />;
}

/** Keramika/chinni (unitaz, rakovina). */
export function CeramicMaterial({ color = "#F3F7FA" }) {
  return <meshStandardMaterial color={color} metalness={0.05} roughness={0.32} />;
}

/** Suv oqimi - yarim shaffof ustun. */
export function WaterStream({
  position,
  height = 0.7,
  radiusTop = 0.02,
  radiusBottom = 0.034,
}: {
  position: [number, number, number];
  height?: number;
  radiusTop?: number;
  radiusBottom?: number;
}) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[radiusTop, radiusBottom, height, 16, 1, true]} />
      <meshStandardMaterial
        color="#EAF5FB"
        transparent
        opacity={0.3}
        roughness={0.04}
        metalness={0}
        side={2}
      />
    </mesh>
  );
}
