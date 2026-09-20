"use client";

import { Link } from "@/lib/i18n/LocaleLink";
import PlumbingOutlinedIcon from "@mui/icons-material/PlumbingOutlined";
import SettingsInputComponentOutlinedIcon from "@mui/icons-material/SettingsInputComponentOutlined";
import WaterDropOutlinedIcon from "@mui/icons-material/WaterDropOutlined";
import ShowerOutlinedIcon from "@mui/icons-material/ShowerOutlined";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import DeviceThermostatOutlinedIcon from "@mui/icons-material/DeviceThermostatOutlined";
import WaterOutlinedIcon from "@mui/icons-material/WaterOutlined";
import BathtubOutlinedIcon from "@mui/icons-material/BathtubOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import { CategoryTile } from "@/components/home/CategoryTile";
import { Reveal } from "@/components/motion/Reveal";
import { useCategories } from "@/lib/products/useTaxonomy";

/** Standart kategoriyalarning belgilari; qolganlari umumiy belgi bilan. */
const CATEGORY_ICONS: Record<string, SvgIconComponent> = {
  pipes: PlumbingOutlinedIcon,
  fittings: SettingsInputComponentOutlinedIcon,
  faucets: WaterDropOutlinedIcon,
  "shower-systems": ShowerOutlinedIcon,
  boilers: LocalFireDepartmentOutlinedIcon,
  radiators: DeviceThermostatOutlinedIcon,
  pumps: WaterOutlinedIcon,
  "sanitary-ware": BathtubOutlinedIcon,
};

/** Bosh sahifada ko'rinadigan kategoriyalar soni (qolgani katalogda). */
const HOME_CATEGORIES = 11;

/**
 * BOSH SAHIFADAGI KATEGORIYALAR TO'RI.
 *
 * Ro'yxat `/api/taxonomy` dan keladi (admin yangi kategoriya ochsa
 * shu yerda ham paydo bo'ladi), shuning uchun bu qism client bo'lib
 * qoladi. Sahifaning o'zi esa SERVER komponent - mahsulotlar HTML
 * bilan birga chiqishi uchun.
 */
export function HomeCategories({ title }: { title: string }) {
  const categories = useCategories();

  return (
    <Reveal as="section" className="mx-auto max-w-7xl px-4 py-10">
      <h2 className="mb-4 text-xl font-bold text-navy-900 dark:text-white">{title}</h2>
      {/*
        Kategoriyalar ko'p (import bilan o'nlab yangisi qo'shildi) -
        bosh sahifada asosiylari turadi, qolgani katalogda.
      */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {/* Kafellar KETMA-KET chiqadi (har biri 40 ms kechikish bilan). */}
        {categories.slice(0, HOME_CATEGORIES).map((item, index) => (
          <Reveal key={item.slug} delay={(index % 6) * 0.04}>
            <CategoryTile
              category={item.slug}
              label={item.label}
              Icon={CATEGORY_ICONS[item.slug] ?? CategoryOutlinedIcon}
            />
          </Reveal>
        ))}
        {categories.length > HOME_CATEGORIES && (
          <Link
            href="/katalog"
            className="flex flex-col items-center justify-center gap-2 rounded-xl2 border border-dashed border-navy-200 p-4 text-center text-sm font-medium text-navy-500 transition hover:border-aqua-500 hover:text-aqua-600 dark:border-navy-500 dark:text-navy-100"
          >
            <CategoryOutlinedIcon />
            +{categories.length - HOME_CATEGORIES} ta yana
          </Link>
        )}
      </div>
    </Reveal>
  );
}
