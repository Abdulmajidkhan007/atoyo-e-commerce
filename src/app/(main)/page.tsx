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

const CATEGORIES = [
  { category: "pipes" as const, label: "Quvurlar", Icon: PlumbingOutlinedIcon },
  { category: "fittings" as const, label: "Muftalar", Icon: SettingsInputComponentOutlinedIcon },
  { category: "faucets" as const, label: "Kranlar", Icon: WaterDropOutlinedIcon },
  { category: "shower-systems" as const, label: "Dush tizimlari", Icon: ShowerOutlinedIcon },
  { category: "boilers" as const, label: "Isitish qozonlari", Icon: LocalFireDepartmentOutlinedIcon },
  { category: "radiators" as const, label: "Radiatorlar", Icon: DeviceThermostatOutlinedIcon },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-16">
          <span className="rounded-full bg-aqua-500/20 px-3 py-1 text-xs font-medium text-aqua-300">
            10,000+ santexnika mahsuloti
          </span>
          <h1 className="max-w-xl text-3xl font-bold md:text-4xl">
            Santexnika va Otopleniye uchun ishonchli manzil
          </h1>
          <p className="max-w-lg text-navy-100">
            Quvurlar, muftalar, kranlar, dush tizimlari va isitish qozonlari - barchasi bir joyda,
            tezkor yetkazib berish bilan.
          </p>
          <Button component={Link} href="/katalog" variant="contained" color="primary" size="large">
            Katalogni ko&apos;rish
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-4 text-xl font-bold text-navy-900 dark:text-white">Kategoriyalar</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {CATEGORIES.map((cat) => (
            <CategoryTile key={cat.category} {...cat} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <h2 className="mb-4 text-xl font-bold text-navy-900 dark:text-white">Yangi mahsulotlar</h2>
        <ProductGrid filters={{ sortBy: "newest" }} searchTerm="" />
      </section>
    </>
  );
}
