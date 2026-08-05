"use client";

import Link from "next/link";
import { Button } from "@mui/material";
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
import { ShowcaseGrid } from "@/components/home/ShowcaseGrid";
import { useI18n } from "@/lib/i18n/LocaleContext";
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

export default function HomePage() {
  const { dict } = useI18n();
  // Bosh sahifadagi bo'limlar ro'yxati ham `/api/taxonomy` dan -
  // admin yangi kategoriya ochsa shu yerda ham paydo bo'ladi.
  const categories = useCategories();

  return (
    <>
      <section className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-16">
          <span className="rounded-full bg-aqua-500/20 px-3 py-1 text-xs font-medium text-aqua-300">
            {dict.home.badge}
          </span>
          <h1 className="max-w-xl text-3xl font-bold md:text-4xl">{dict.home.heroTitle}</h1>
          <p className="max-w-lg text-navy-100">{dict.home.heroText}</p>
          <Button component={Link} href="/katalog" variant="contained" color="primary" size="large">
            {dict.home.viewCatalog}
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-4 text-xl font-bold text-navy-900 dark:text-white">{dict.home.categories}</h2>
        {/*
          Kategoriyalar ko'p (import bilan o'nlab yangisi qo'shildi) -
          bosh sahifada asosiylari turadi, qolgani katalogda.
        */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {categories.slice(0, HOME_CATEGORIES).map((item) => (
            <CategoryTile
              key={item.slug}
              category={item.slug}
              label={item.label}
              Icon={CATEGORY_ICONS[item.slug] ?? CategoryOutlinedIcon}
            />
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
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <h2 className="mb-4 text-xl font-bold text-navy-900 dark:text-white">{dict.home.newProducts}</h2>
        <ShowcaseGrid />
      </section>
    </>
  );
}
