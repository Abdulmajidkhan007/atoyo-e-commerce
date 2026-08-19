"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { BackSide, DoubleSide, MathUtils, type Group } from "three";
import { findFinish, type FinishId } from "@/lib/three/finishes";

/**
 * MARKAZIY MAHSULOT — "premium product shot": plita ustidagi
 * KOSASIMON moyka (vessel sink) va gooseneck kran.
 *
 * NEGA KOSA PLITA USTIDA? Avval kosa plitaning ICHIGA qo'yilgan edi:
 * plita esa to'la (teshiksiz) jism, shuning uchun yuqoridan qaraganda
 * hech qanday chuqurlik ko'rinmasdi — mahsulot "ko'k taxta" bo'lib
 * chiqardi. Ustiga qo'yilgan kosa esa bir qarashda tanaladi va
 * zamonaviy santexnikaning o'zi shunday sotiladi.
 *
 * Hamma shakl KODDAN: `.glb` model yo'q (CSP tashqi hostni bloklaydi
 * va fayl yuklash ochilishni sekinlashtiradi).
 *
 * Materiallar uch xil "til" bilan gapiradi:
 *   • plita  — mat tosh (yorug'likni yutadi, fon bo'ladi);
 *   • kosa   — sayqallangan po'lat (aks ettiradi);
 *   • kran   — brend oltini (asosiy urg'u).
 */

const STEEL = "#DCE9F1";
const STEEL_DEEP = "#93B4C6";

/** Kosaning radiusi va jiyagining balandligi - qolgan o'lchamlar shundan. */
const BOWL_RADIUS = 0.56;
const BOWL_RIM_Y = -0.16;

export function ProductShowpiece({
  compact = false,
  finishId = "gold",
}: {
  compact?: boolean;
  /** Kran va detallarning qoplamasi (mijoz hero'da tanlaydi). */
  finishId?: FinishId;
}) {
  const group = useRef<Group>(null);
  const finish = findFinish(finishId);

  // Juda sekin tebranish: mahsulot har tomondan ko'rinadi, lekin
  // "aylanayotgan bezak" bo'lib ko'zni charchatmaydi.
  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;
    node.rotation.y = MathUtils.damp(
      node.rotation.y,
      Math.sin(state.clock.elapsedTime * 0.12) * 0.3,
      1.5,
      delta
    );
  });

  return (
    <group ref={group} scale={compact ? 0.95 : 1.15}>
      {/* --- Plita (tosh ish stoli) --- */}
      <RoundedBox args={[2.5, 0.12, 1.45]} radius={0.045} smoothness={4} position={[0, -0.78, 0]}>
        <meshStandardMaterial color="#0A3348" roughness={0.45} metalness={0.3} />
      </RoundedBox>

      {/* --- KOSA (vessel moyka) ---
          Yarim shar: tashqi yuzasi + ichki yuzasi (`BackSide`) alohida
          chiziladi, shunda ichkarisi ham ko'rinadi va chuqurlik
          seziladi. */}
      <group position={[0, BOWL_RIM_Y, 0.05]}>
        <mesh>
          <sphereGeometry args={[BOWL_RADIUS, 56, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color={STEEL} metalness={1} roughness={0.14} />
        </mesh>
        <mesh>
          <sphereGeometry
            args={[BOWL_RADIUS - 0.03, 56, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
          />
          <meshStandardMaterial color={STEEL_DEEP} metalness={1} roughness={0.22} side={BackSide} />
        </mesh>
        {/* Jiyak. */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[BOWL_RADIUS - 0.015, 0.028, 16, 72]} />
          <meshStandardMaterial color={STEEL} metalness={1} roughness={0.08} />
        </mesh>
        {/* Tubidagi suv teshigi. */}
        <mesh position={[0, -BOWL_RADIUS + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.035, 0.07, 24]} />
          <meshStandardMaterial
            color={finish.color}
            metalness={finish.metalness}
            roughness={Math.min(1, finish.roughness + 0.12)}
          />
        </mesh>
      </group>

      {/* --- KRAN (gooseneck) ---
          Ustun plitaning orqa qismida, "bo'yin" oldinga engashadi va
          jo'mrak uchi kosaning aynan markazida turadi. */}
      <group position={[0, -0.72, -0.52]}>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.19, 0.22, 0.08, 40]} />
          <meshStandardMaterial
            color={finish.color}
            metalness={finish.metalness}
            roughness={Math.min(1, finish.roughness + 0.12)}
          />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.075, 0.095, 1.12, 32]} />
          <meshStandardMaterial
            color={finish.color}
            metalness={finish.metalness}
            roughness={finish.roughness}
          />
        </mesh>

        {/* Yarim halqa YZ tekisligida (Y bo'yicha 90° burilgan):
            ustundan chiqib OLDINGA engashadi. */}
        <mesh position={[0, 1.18, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.29, 0.075, 20, 56, Math.PI]} />
          <meshStandardMaterial
            color={finish.color}
            metalness={finish.metalness}
            roughness={finish.roughness}
          />
        </mesh>

        {/* Jo'mrak uchi - kosa markazidan pastga qaragan. */}
        <mesh position={[0, 1.12, 0.58]}>
          <cylinderGeometry args={[0.058, 0.07, 0.2, 24]} />
          <meshStandardMaterial
            color={finish.color}
            metalness={finish.metalness}
            roughness={Math.min(1, finish.roughness + 0.08)}
          />
        </mesh>

        {/* Dastak (lever) va uning sharchasi. */}
        <mesh position={[0.17, 0.98, -0.05]} rotation={[0.2, 0, -0.7]}>
          <cylinderGeometry args={[0.026, 0.026, 0.28, 16]} />
          <meshStandardMaterial color={STEEL} metalness={1} roughness={0.12} />
        </mesh>
        <mesh position={[0.06, 0.92, -0.02]}>
          <sphereGeometry args={[0.055, 20, 20]} />
          <meshStandardMaterial
            color={finish.color}
            metalness={finish.metalness}
            roughness={finish.roughness}
          />
        </mesh>
      </group>

      {/* --- Suv oqimi: jo'mrakdan kosaga --- */}
      <mesh position={[0, 0.02, 0.06]}>
        <cylinderGeometry args={[0.02, 0.034, 0.72, 16, 1, true]} />
        <meshStandardMaterial
          color="#EAF5FB"
          transparent
          opacity={0.3}
          roughness={0.04}
          metalness={0}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}
