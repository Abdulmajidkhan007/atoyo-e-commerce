"use client";

import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import { Color, MeshStandardMaterial, type Object3D } from "three";
import { DEFAULT_FINISH, findFinish, type Finish, type FinishId } from "@/lib/three/finishes";
import { FinishPicker } from "./FinishPicker";
import { CategoryModel, cameraDistanceFor } from "./models/registry";

/**
 * MAHSULOT 3D KONFIGURATORI.
 *
 * Mijoz mahsulotni 360° aylantirib ko'radi va QOPLAMASINI almashtiradi
 * (xrom / tillarang / mat qora). Ikki manbadan ishlaydi:
 *
 *   1) `modelUrl` berilgan va fayl mavjud bo'lsa - HAQIQIY `.glb`
 *      (`useGLTF`, nusxasi `scene.clone()` bilan olinadi va materiallar
 *      `traverse` orqali yangilanadi);
 *   2) fayl yo'q yoki yuklanmasa - KATEGORIYA bo'yicha parametrik
 *      model (koddan yasalgan). Shu sabab konfigurator hech qachon
 *      "qulab" tushmaydi va bo'sh joy qoldirmaydi.
 *
 * MUHIM (CSP): drei'ning `<Environment preset="city" />` i HDR faylni
 * GitHub CDN'dan yuklaydi - saytimizning CSP'si tashqi hostni
 * bloklaydi va sahna QORA bo'lib qolardi. Shuning uchun muhit
 * `Lightformer` plitalari bilan XOTIRADA quriladi: fayl ham yo'q,
 * aks etish ham bor.
 */

export interface FaucetConfiguratorProps {
  /** Ixtiyoriy `.glb` manzili (masalan `/models/faucet.glb`). */
  modelUrl?: string;
  /** Model tanlash uchun kategoriya slug'i (`faucets`, `radiators`...). */
  category?: string;
  /** Boshlang'ich qoplama. */
  initialFinish?: FinishId;
  /** Qoplama o'zgarganda (masalan mahsulot turini tanlash uchun). */
  onFinishChange?: (finish: Finish) => void;
  className?: string;
  /** Canvas balandligi (Tailwind klassi). */
  heightClass?: string;
}

/* ------------------------------------------------------------------ */
/*  .glb yuklash (xatosi ushlanadi)                                    */
/* ------------------------------------------------------------------ */

/** Modeldagi hamma materialga tanlangan qoplamani qo'llaydi. */
function applyFinish(root: Object3D, finish: Finish): void {
  const color = new Color(finish.color);
  root.traverse((node) => {
    const mesh = node as Object3D & { material?: MeshStandardMaterial | MeshStandardMaterial[] };
    if (!mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      // Faqat standart/fizik materiallarda `metalness` bor.
      if (!(material instanceof MeshStandardMaterial)) continue;
      material.color.copy(color);
      material.metalness = finish.metalness;
      material.roughness = finish.roughness;
      material.needsUpdate = true;
    }
  });
}

function GlbModel({ url, finish }: { url: string; finish: Finish }) {
  const { scene } = useGLTF(url);
  // NUSXA: bitta model bir necha joyda ishlatilishi mumkin, asl
  // sahnaning materiallarini o'zgartirsak boshqa joyda ham o'zgarardi.
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    applyFinish(cloned, finish);
  }, [cloned, finish]);

  return <primitive object={cloned} />;
}

/**
 * `.glb` topilmasa (404) yoki buzuq bo'lsa - parametrik modelga
 * o'tadi. React'da bunday xatoni faqat class komponent ushlay oladi.
 */
class ModelBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Bu kutilgan holat (model hali yuklanmagan) - konsolga qisqa izoh.
    console.warn("3D model yuklanmadi, parametrik modelga o'tildi:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/*  Yuklanish ko'rsatkichi                                             */
/* ------------------------------------------------------------------ */

function ConfiguratorLoader() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-aqua-500/30 border-t-aqua-500" />
      <span className="text-xs text-navy-300">3D model yuklanmoqda…</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Asosiy komponent                                                   */
/* ------------------------------------------------------------------ */

export function FaucetConfigurator({
  modelUrl,
  category,
  initialFinish = DEFAULT_FINISH,
  onFinishChange,
  className = "",
  heightClass = "h-[320px] sm:h-[420px]",
}: FaucetConfiguratorProps) {
  const [finishId, setFinishId] = useState<FinishId>(initialFinish);
  const finish = findFinish(finishId);
  const distance = cameraDistanceFor(category);

  const selectFinish = (next: Finish) => {
    setFinishId(next.id);
    onFinishChange?.(next);
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative overflow-hidden rounded-xl2 border border-white/10 bg-[radial-gradient(120%_120%_at_30%_0%,#0B3B54_0%,#072D40_55%,#04202F_100%)] ${heightClass}`}
      >
        <Suspense fallback={<ConfiguratorLoader />}>
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [distance * 0.75, distance * 0.45, distance], fov: 35 }}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          >
            <ambientLight intensity={0.55} />
            <directionalLight position={[4, 6, 4]} intensity={1.5} />

            {/* Model: avval .glb, bo'lmasa parametrik. */}
            <ModelBoundary fallback={<CategoryModel category={category} finish={finish} />}>
              {modelUrl ? (
                <Suspense fallback={null}>
                  <GlbModel url={modelUrl} finish={finish} />
                </Suspense>
              ) : (
                <CategoryModel category={category} finish={finish} />
              )}
            </ModelBoundary>

            <ContactShadows position={[0, -1.35, 0]} opacity={0.45} scale={9} blur={2.4} far={4} />

            {/* Muhit - HDR FAYLSIZ (yuqoridagi izohga qarang). */}
            <Environment resolution={160}>
              <Lightformer intensity={2.6} position={[0, 4, 2]} scale={[8, 2, 1]} color="#ffffff" />
              <Lightformer intensity={1.6} position={[-5, 1, 2]} scale={[5, 5, 1]} color="#C49A6C" />
              <Lightformer intensity={1.2} position={[5, -1, 1]} scale={[5, 5, 1]} color="#5E8CA6" />
            </Environment>

            {/* Zum o'chirilgan: sahifa skrollini "yeb qo'ymasin". */}
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={1.2}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 1.9}
            />
          </Canvas>
        </Suspense>

        {/* --- Suzuvchi boshqaruv paneli (glassmorphism) --- */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
          <FinishPicker value={finishId} onChange={selectFinish} className="pointer-events-auto" />
        </div>
      </div>
    </div>
  );
}
