"use client";

import Link from "next/link";
import { Button } from "@mui/material";
import PlumbingOutlinedIcon from "@mui/icons-material/PlumbingOutlined";
import SettingsInputComponentOutlinedIcon from "@mui/icons-material/SettingsInputComponentOutlined";
import WaterDropOutlinedIcon from "@mui/icons-material/WaterDropOutlined";
import ShowerOutlinedIcon from "@mui/icons-material/ShowerOutlined";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import DeviceThermostatOutlinedIcon from "@mui/icons-material/DeviceThermostatOutlined";
import { CategoryTile } from "@/components/home/CategoryTile";
import { ProductGrid } from "@/components/product/ProductGrid";
import { useTranslation } from "@/i18n/I18nProvider";

const CATEGORY_ICONS = [
  { category: "pipes" as const, Icon: PlumbingOutlinedIcon },
  { category: "fittings" as const, Icon: SettingsInputComponentOutlinedIcon },
  { category: "faucets" as const, Icon: WaterDropOutlinedIcon },
  { category: "shower-systems" as const, Icon: ShowerOutlinedIcon },
  { category: "boilers" as const, Icon: LocalFireDepartmentOutlinedIcon },
  { category: "radiators" as const, Icon: DeviceThermostatOutlinedIcon },
];

export default function HomePage() {
  const t = useTranslation();

  return (
    <>
      <section className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-16">
          <span className="rounded-full bg-aqua-500/20 px-3 py-1 text-xs font-medium text-aqua-300">
            {t.home.badge}
          </span>
          <h1 className="max-w-xl text-3xl font-bold md:text-4xl">{t.home.heroTitle}</h1>
          <p className="max-w-lg text-navy-100">{t.home.heroSubtitle}</p>
          <Button component={Link} href="/katalog" variant="contained" color="primary" size="large">
            {t.home.heroCta}
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-4 text-xl font-bold text-navy-900 dark:text-white">{t.home.categoriesTitle}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {CATEGORY_ICONS.map((cat) => (
            <CategoryTile key={cat.category} category={cat.category} label={t.categories[cat.category]} Icon={cat.Icon} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <h2 className="mb-4 text-xl font-bold text-navy-900 dark:text-white">{t.home.newProductsTitle}</h2>
        <ProductGrid filters={{ sortBy: "newest" }} searchTerm="" />
      </section>
    </>
  );
}
