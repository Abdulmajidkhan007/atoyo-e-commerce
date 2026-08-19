"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer } from "@react-three/drei";
import { MathUtils, type Group } from "three";

/**
 * BOSH SAHIFADAGI 3D SAHNA — santexnika shakllari.
 *
 * MUHIM QAROR: sahna TASHQI FAYLSIZ (.glb/.hdr) qurilgan - hamma
 * shakl koddan yasaladi. Sabab ikkita:
 *   1) saytning CSP qoidasi tashqi hostlarni bloklaydi
 *      (`lib/http/csp.ts`), ya'ni CDN'dan model tortib bo'lmaydi;
 *   2) fayl yo'q - yuklanish tez, keshlash muammosi yo'q.
 *
 * Yorug'lik ham shunday: `Environment` ichidagi `Lightformer` lar
 * kubik xaritani XOTIRADA yasaydi (HDR fayl yuklanmaydi) - metall
 * yuzalar aks etadigan bo'ladi.
 *
 * Ranglar brend palitrasidan: `#C49A6C` (oltin urg'u) va `#072D40`
 * (chuqur petrol ko'k) - `tailwind.config.ts` bilan bir xil.
 */

const GOLD = "#C49A6C";
const GOLD_DARK = "#8A6640";
const STEEL = "#A8C6D6";

/** Metall material - hamma detal uchun bir xil "til". */
function MetalMaterial({ color = GOLD, roughness = 0.22 }: { color?: string; roughness?: number }) {
  return <meshStandardMaterial color={color} metalness={1} roughness={roughness} envMapIntensity={1.1} />;
}

/** BURCHAK MUFTA: chorak halqa + ikki uchidagi quvur. */
function PipeElbow(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <mesh rotation={[0, 0, 0]}>
        {/* radius, quvur qalinligi, segmentlar, yoy = 90° */}
        <torusGeometry args={[1, 0.28, 24, 48, Math.PI / 2]} />
        <MetalMaterial />
      </mesh>
      <mesh position={[1, -0.45, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.9, 24]} />
        <MetalMaterial />
      </mesh>
      <mesh position={[-0.45, 1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.28, 0.28, 0.9, 24]} />
        <MetalMaterial />
      </mesh>
      {/* Uchlaridagi gayka halqalari - siluetni "santexnika" qiladi. */}
      <mesh position={[1, -0.85, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.16, 6]} />
        <MetalMaterial color={GOLD_DARK} roughness={0.35} />
      </mesh>
      <mesh position={[-0.85, 1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.34, 0.34, 0.16, 6]} />
        <MetalMaterial color={GOLD_DARK} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** KRAN (smesitel): tagi, tanasi, egri jo'mragi va dastagi. */
function Faucet(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <mesh position={[0, -0.9, 0]}>
        <cylinderGeometry args={[0.5, 0.55, 0.18, 32]} />
        <MetalMaterial roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.26, 0.3, 1.4, 32]} />
        <MetalMaterial />
      </mesh>
      {/* Jo'mrak - yarim halqa. */}
      <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.6, 0.13, 20, 40, Math.PI / 1.6]} />
        <MetalMaterial />
      </mesh>
      <mesh position={[0.32, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.5, 20]} />
        <MetalMaterial color={STEEL} roughness={0.15} />
      </mesh>
    </group>
  );
}

/** RADIATOR: bir necha yupqa qovurg'a (qatorlar `useMemo` bilan). */
function Radiator(props: ThreeElements["group"]) {
  const fins = useMemo(() => [0, 1, 2, 3, 4], []);
  return (
    <group {...props}>
      {fins.map((index) => (
        <mesh key={index} position={[index * 0.26 - 0.52, 0, 0]}>
          <boxGeometry args={[0.16, 1.5, 0.5]} />
          <MetalMaterial color={index % 2 === 0 ? GOLD : GOLD_DARK} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[1.5, 0.16, 0.5]} />
        <MetalMaterial color={STEEL} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.82, 0]}>
        <boxGeometry args={[1.5, 0.16, 0.5]} />
        <MetalMaterial color={STEEL} roughness={0.3} />
      </mesh>
    </group>
  );
}

/**
 * Sahna mazmuni: shakllar guruhi sekin aylanadi va SICHQONCHAGA
 * muloyim javob beradi (`lerp` - keskin sakramaydi).
 */
function Composition() {
  const group = useRef<Group>(null);

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;

    // `state.pointer` — -1..1 oralig'idagi kursor holati.
    const targetY = state.pointer.x * 0.4;
    const targetX = -state.pointer.y * 0.25;
    // `damp` kadr tezligiga bog'liq emas: 30 fps da ham, 120 fps da
    // ham harakat bir xil tezlikda tuyuladi.
    node.rotation.y = MathUtils.damp(node.rotation.y, targetY, 3, delta);
    node.rotation.x = MathUtils.damp(node.rotation.x, targetX, 3, delta);
  });

  return (
    // Guruh biroz chapga va yuqoriga surilgan: aks holda kompozitsiya
    // kadrning o'ng pastki burchagiga yopishib qoladi.
    <group ref={group} position={[-0.25, 0.35, 0]} scale={0.92}>
      <Float speed={1.1} rotationIntensity={0.35} floatIntensity={0.7}>
        <PipeElbow position={[-1.7, 0.4, 0]} rotation={[0.2, 0.5, 0.4]} scale={0.85} />
      </Float>
      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.5}>
        <Faucet position={[0.9, 0.15, 0.4]} rotation={[0.1, -0.35, 0.12]} scale={0.95} />
      </Float>
      <Float speed={0.9} rotationIntensity={0.3} floatIntensity={0.6}>
        <Radiator position={[0.2, -1.15, -1.2]} rotation={[0.15, 0.4, -0.08]} scale={0.7} />
      </Float>
    </group>
  );
}

/**
 * Sahna. `frameloop` TASHQARIDAN boshqariladi: sahna ko'rinmay qolsa
 * yoki brauzer varag'i orqaga o'tsa `"never"` beriladi va GPU
 * butunlay to'xtaydi (batareya tejaladi).
 */
export default function HeroScene({ active }: { active: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      // Retina ekranda 3x piksel chizish shart emas - 1.5 yetarli.
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6.2], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} />
      <pointLight position={[-5, -2, 3]} intensity={35} color={GOLD} distance={14} />

      <Composition />

      {/* Yerdagi mayin soya - shakllar "havoda osilib" qolmaydi. */}
      <ContactShadows position={[0, -2.4, 0]} opacity={0.35} scale={12} blur={2.6} far={4} />

      {/*
        HDR FAYLSIZ atrof-muhit: quyidagi "yorug'lik plitalari"
        kubik xaritani xotirada yasaydi. Metall yuzalar aynan shu
        aks etishlar hisobiga tirik ko'rinadi.
      */}
      <Environment resolution={128}>
        <Lightformer intensity={2.2} position={[0, 4, 2]} scale={[8, 2, 1]} color="#ffffff" />
        <Lightformer intensity={1.4} position={[-4, 1, 2]} scale={[4, 4, 1]} color={GOLD} />
        <Lightformer intensity={1} position={[4, -1, 1]} scale={[4, 4, 1]} color="#5E8CA6" />
      </Environment>
    </Canvas>
  );
}
