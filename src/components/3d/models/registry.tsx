"use client";

import type { Finish } from "@/lib/three/finishes";
import { FaucetModel } from "./FaucetModel";
import { SinkModel } from "./SinkModel";
import { RadiatorModel } from "./RadiatorModel";
import { PipeModel } from "./PipeModel";
import { ShowerModel } from "./ShowerModel";
import { ToiletModel } from "./ToiletModel";
import { BoilerModel } from "./BoilerModel";

/**
 * KATEGORIYA → 3D MODEL.
 *
 * Har mahsulot uchun alohida `.glb` yasash real emas (katalogda
 * 10 000+ mahsulot). Shuning uchun modellar KATEGORIYA darajasida:
 * mijoz "kran" ni ochsa kran, "radiator" ni ochsa radiator ko'radi,
 * qoplamasi esa o'zi tanlagan qoplama bo'ladi.
 *
 * Kategoriya slug'lari `lib/products/taxonomy.ts` dagilar bilan bir
 * xil; notanish kategoriya kelsa - kran (eng ko'p uchraydigan tur).
 *
 * DIQQAT: bu yerda komponent QAYTARILMAYDI, balki CHIZILADI
 * (`switch` + JSX). Funksiyadan komponent qaytarilsa React uni har
 * renderda "yangi tur" deb biladi va butun daraxtni qayta yaratadi
 * (eslint `react-hooks/static-components` shuni ushlaydi).
 */

export function CategoryModel({ category, finish }: { category?: string; finish: Finish }) {
  switch (category) {
    case "shower-systems":
      return <ShowerModel finish={finish} />;
    case "sanitary-ware":
    case "rakovina":
      return <SinkModel finish={finish} ceramic />;
    case "moyka":
      return <SinkModel finish={finish} />;
    case "radiators":
      return <RadiatorModel finish={finish} />;
    case "boilers":
    case "pumps":
      return <BoilerModel finish={finish} />;
    case "pipes":
    case "fittings":
    case "xostovar":
      return <PipeModel finish={finish} />;
    case "unitaz":
      return <ToiletModel finish={finish} />;
    default:
      // faucets, smestitellar, veshilka va notanish kategoriyalar.
      return <FaucetModel finish={finish} />;
  }
}

/** Kategoriya modeli qaysi masofadan chiroyli ko'rinadi. */
export function cameraDistanceFor(category: string | undefined): number {
  if (category === "shower-systems") return 5.6;
  if (category === "radiators" || category === "boilers" || category === "pumps") return 4.8;
  if (category === "unitaz") return 4.6;
  return 4.2;
}
