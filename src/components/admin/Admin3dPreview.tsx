"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

/**
 * 3D KO'RINISHNI ADMIN PANELDA SINASH.
 *
 * 3D rejim mijozlarga standart holda KO'RINMAYDI (Sozlamalar → Sayt
 * ma'lumotlari → "3D rejim tugmasi"). Lekin uni baholash uchun bir
 * joyda ko'rish kerak — shu sahifa aynan shuning uchun: kategoriya
 * tanlanadi, model aylantiriladi, qoplama almashtiriladi.
 *
 * Canvas DINAMIK yuklanadi (`ssr: false`): `three` paketi admin
 * panelning boshqa sahifalariga tushib qolmasin.
 */
const FaucetConfigurator = dynamic(
  () => import("@/components/3d/FaucetConfigurator").then((m) => m.FaucetConfigurator),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-xl2 border border-navy-100 text-sm text-navy-300 dark:border-navy-500">
        3D sahna yuklanmoqda…
      </div>
    ),
  }
);

/** Sinov uchun kategoriyalar - `components/3d/models/registry.tsx` dagi modellar. */
const CATEGORIES = [
  { slug: "faucets", label: "Kran / smesitel" },
  { slug: "moyka", label: "Moyka" },
  { slug: "rakovina", label: "Rakovina" },
  { slug: "unitaz", label: "Unitaz" },
  { slug: "shower-systems", label: "Dush tizimi" },
  { slug: "radiators", label: "Radiator" },
  { slug: "boilers", label: "Kotyol / nasos" },
  { slug: "pipes", label: "Quvur va fitting" },
] as const;

export function Admin3dPreview() {
  const [category, setCategory] = useState<string>(CATEGORIES[0].slug);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => setCategory(item.slug)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              category === item.slug
                ? "bg-aqua-500 text-navy-900"
                : "border border-navy-100 text-navy-300 hover:border-aqua-500 dark:border-navy-500"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <FaucetConfigurator key={category} category={category} heightClass="h-[420px] sm:h-[520px]" />
    </div>
  );
}
