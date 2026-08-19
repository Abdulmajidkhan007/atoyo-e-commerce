"use client";

import { FinishMaterial } from "./parts";
import type { Finish } from "@/lib/three/finishes";

/** ISITISH QOZONI — devorga osiladigan korpus, quvurlar va ekran. */
export function BoilerModel({ finish }: { finish: Finish }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[1.35, 1.75, 0.62]} />
        <meshStandardMaterial color="#EDF2F6" metalness={0.25} roughness={0.42} />
      </mesh>
      {/* Boshqaruv paneli */}
      <mesh position={[0, -0.35, 0.33]}>
        <boxGeometry args={[1, 0.42, 0.06]} />
        <meshStandardMaterial color="#0A3348" metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[-0.22, -0.35, 0.37]}>
        <boxGeometry args={[0.36, 0.2, 0.02]} />
        <meshStandardMaterial color="#7FE3D6" emissive="#2BB3A3" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.28, -0.35, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.05, 24]} />
        <FinishMaterial finish={finish} />
      </mesh>
      {/* Pastdagi ulanish quvurlari */}
      {[-0.42, -0.14, 0.14, 0.42].map((x) => (
        <mesh key={x} position={[x, -1.02, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.32, 20]} />
          <FinishMaterial finish={finish} />
        </mesh>
      ))}
    </group>
  );
}
