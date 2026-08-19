"use client";

import { useRouter } from "next/navigation";
import type { SvgIconComponent } from "@mui/icons-material";
import { useAppDispatch } from "@/redux/hooks";
import { setFilters } from "@/redux/slices/filterSlice";
import type { ProductCategory } from "@/types/product";
import { useImmersive } from "@/lib/ui-mode/useImmersive";

interface CategoryTileProps {
  category: ProductCategory;
  label: string;
  Icon: SvgIconComponent;
}

/** Klassik va 3D rejim uchun ikki xil ko'rinish (mazmuni bir xil). */
const CLASSIC_TILE =
  "border-navy-100 bg-white hover:border-aqua-500 hover:shadow-md dark:border-navy-500 dark:bg-navy-700";
const GLASS_TILE =
  "border-navy-100/80 bg-white/55 backdrop-blur-md shadow-[0_6px_24px_rgba(7,45,64,0.08)] hover:-translate-y-1 hover:border-aqua-500 hover:shadow-[0_12px_32px_rgba(7,45,64,0.16)] dark:border-white/10 dark:bg-navy-800/50";

export function CategoryTile({ category, label, Icon }: CategoryTileProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { immersive } = useImmersive();

  return (
    <button
      onClick={() => {
        dispatch(setFilters({ category }));
        router.push("/katalog");
      }}
      className={`flex flex-col items-center gap-2 rounded-xl2 border p-4 text-center transition duration-300 ${
        immersive ? GLASS_TILE : CLASSIC_TILE
      }`}
    >
      <Icon className="text-aqua-500" fontSize="large" />
      <span className="text-sm font-medium text-navy-900 dark:text-white">{label}</span>
    </button>
  );
}
