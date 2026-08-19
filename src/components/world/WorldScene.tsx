"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer } from "@react-three/drei";
import { MathUtils, Vector3, type Group } from "three";
import { CategoryModel } from "@/components/3d/models/registry";
import { findFinish, type FinishId } from "@/lib/three/finishes";
import { SHELF_CATEGORIES, type Station } from "@/lib/world/stations";

/**
 * 3D DUNYO — sahifalar ortidagi uzluksiz makon.
 *
 * Bitta Canvas butun do'kon bo'ylab yashaydi: sahifa almashganda u
 * QAYTA YARATILMAYDI, faqat kamera boshqa bekatga uchib boradi
 * (`stations.ts`). Shu sabab o'tishlar "sayt qayta yuklanayotgandek"
 * emas, "do'kon ichida yurayotgandek" tuyuladi.
 *
 * Dunyo BEZAK: `pointer-events` yopiq, hamma matn va havolalar
 * odatdagi HTML'da qoladi (SEO va ekran o'quvchi uchun).
 */

const GOLD = "#C49A6C";

/* ------------------------------------------------------------------ */
/*  Kamera - bekatdan bekatga                                          */
/* ------------------------------------------------------------------ */

const desired = new Vector3();
const lookAt = new Vector3();
const targetLook = new Vector3();

function StationRig({ station, compact }: { station: Station; compact: boolean }) {
  useFrame((state, delta) => {
    desired.set(...station.camera);
    targetLook.set(...station.target);

    // Telefonda kamera biroz orqaroqda: kadr tor.
    if (compact) desired.multiplyScalar(1.15);

    // Sichqoncha parallaksi - juda mayin (dunyo "tirik" tuyulsin).
    desired.x += state.pointer.x * (compact ? 0.15 : 0.5);
    desired.y += state.pointer.y * (compact ? 0.1 : 0.3);

    state.camera.position.x = MathUtils.damp(state.camera.position.x, desired.x, 1.6, delta);
    state.camera.position.y = MathUtils.damp(state.camera.position.y, desired.y, 1.6, delta);
    state.camera.position.z = MathUtils.damp(state.camera.position.z, desired.z, 1.6, delta);

    lookAt.lerp(targetLook, 1 - Math.exp(-2.2 * delta));
    state.camera.lookAt(lookAt);
  });

  return null;
}

/* ------------------------------------------------------------------ */
/*  Bekat mazmuni                                                      */
/* ------------------------------------------------------------------ */

/** KATALOG: kategoriya modellari yoy bo'ylab tizilgan "javon". */
function Shelf({ finish, compact }: { finish: FinishId; compact: boolean }) {
  const materials = findFinish(finish);
  const items = useMemo(
    () =>
      SHELF_CATEGORIES.map((category, index) => {
        const count = SHELF_CATEGORIES.length;
        // Yoy: markazdagi modellar yaqinroq, chetdagilari uzoqroq -
        // shunda tekis qator emas, chuqurlik seziladi.
        const t = (index / (count - 1)) * 2 - 1;
        return {
          category,
          position: [t * (compact ? 3.4 : 5.2), 0, -Math.abs(t) * 1.6] as [number, number, number],
          rotation: [0, -t * 0.5, 0] as [number, number, number],
          scale: 0.72,
        };
      }),
    [compact]
  );

  return (
    <group position={[0, -0.4, 0]}>
      {items.map((item, index) => (
        <Float
          key={item.category}
          speed={0.8 + index * 0.07}
          rotationIntensity={0.18}
          floatIntensity={0.45}
        >
          <group position={item.position} rotation={item.rotation} scale={item.scale}>
            <CategoryModel category={item.category} finish={materials} />
          </group>
        </Float>
      ))}
    </group>
  );
}

/** MAHSULOT: bitta model, uzoqroqda va jim (sahifadagi konfigurator asosiy). */
function Spotlight({ category, finish }: { category?: string; finish: FinishId }) {
  const group = useRef<Group>(null);
  const materials = findFinish(finish);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y = MathUtils.damp(
      group.current.rotation.y,
      Math.sin(state.clock.elapsedTime * 0.1) * 0.35,
      1.2,
      delta
    );
  });

  return (
    <group ref={group} position={[-2.2, -0.3, -1.5]} scale={1.05}>
      <CategoryModel category={category} finish={materials} />
    </group>
  );
}

/** SAVAT/CHECKOUT: "peshtaxta" va yetkazish to'ri. */
function Counter({ finish }: { finish: FinishId }) {
  const materials = findFinish(finish);
  return (
    <group position={[0, -0.8, 0]}>
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[6.2, 0.2, 2.6]} />
        <meshStandardMaterial color="#0A3348" roughness={0.5} metalness={0.25} />
      </mesh>
      <Float speed={0.9} rotationIntensity={0.2} floatIntensity={0.5}>
        <group position={[-1.6, 1.1, 0]} scale={0.62}>
          <CategoryModel category="faucets" finish={materials} />
        </group>
      </Float>
      <Float speed={0.7} rotationIntensity={0.2} floatIntensity={0.45}>
        <group position={[1.7, 1.05, -0.4]} scale={0.6}>
          <CategoryModel category="pipes" finish={materials} />
        </group>
      </Float>
      <gridHelper args={[9, 18, GOLD, "#175071"]} position={[0, 0.02, 0]}>
        <meshBasicMaterial attach="material" transparent opacity={0.18} />
      </gridHelper>
    </group>
  );
}

/** QOLGAN SAHIFALAR: jim suzuvchi detallar. */
function Drift({ finish }: { finish: FinishId }) {
  const materials = findFinish(finish);
  return (
    <group position={[0, -0.2, -1]}>
      <Float speed={0.6} rotationIntensity={0.3} floatIntensity={0.7}>
        <group position={[-3.4, 0.9, 0]} scale={0.55}>
          <CategoryModel category="pipes" finish={materials} />
        </group>
      </Float>
      <Float speed={0.8} rotationIntensity={0.25} floatIntensity={0.6}>
        <group position={[3.6, -0.4, -1.2]} scale={0.5}>
          <CategoryModel category="faucets" finish={materials} />
        </group>
      </Float>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Sahna                                                              */
/* ------------------------------------------------------------------ */

export interface WorldSceneProps {
  station: Station;
  active: boolean;
  finish: FinishId;
  quality?: "mid" | "high";
}

export default function WorldScene({
  station,
  active,
  finish,
  quality = "high",
}: WorldSceneProps) {
  const light = quality === "mid";

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={light ? [1, 1.25] : [1, 1.75]}
      camera={{ position: station.camera, fov: 40 }}
      gl={{ antialias: !light, alpha: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
    >
      <StationRig station={station} compact={light} />

      <ambientLight intensity={light ? 0.8 : 0.5} />
      <directionalLight position={[5, 7, 4]} intensity={light ? 2 : 1.5} />
      <pointLight position={[-6, 2, 4]} intensity={30} color={GOLD} distance={20} />

      {station.content === "shelf" && <Shelf finish={finish} compact={light} />}
      {station.content === "spotlight" && <Spotlight finish={finish} />}
      {station.content === "counter" && <Counter finish={finish} />}
      {station.content === "drift" && <Drift finish={finish} />}

      {/* Muhit HDR FAYLSIZ (CSP tashqi hostni bloklaydi). */}
      <Environment resolution={light ? 64 : 128}>
        <Lightformer
          intensity={light ? 3 : 2.2}
          position={[0, 5, 3]}
          scale={[10, 2, 1]}
          color="#ffffff"
        />
        <Lightformer intensity={1.5} position={[-6, 1, 3]} scale={[6, 6, 1]} color={GOLD} />
        <Lightformer intensity={1.1} position={[6, -1, 2]} scale={[6, 6, 1]} color="#5E8CA6" />
      </Environment>
    </Canvas>
  );
}
