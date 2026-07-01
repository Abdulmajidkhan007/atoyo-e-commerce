"use client";

import { useRouter } from "next/navigation";
import type { SvgIconComponent } from "@mui/icons-material";
import { useAppDispatch } from "@/redux/hooks";
import { setFilters } from "@/redux/slices/filterSlice";
import type { ProductCategory } from "@/types/product";

interface CategoryTileProps {
  category: ProductCategory;
  label: string;
  Icon: SvgIconComponent;
}

export function CategoryTile({ category, label, Icon }: CategoryTileProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  return (
    <button
      onClick={() => {
        dispatch(setFilters({ category }));
        router.push("/katalog");
      }}
      className="flex flex-col items-center gap-2 rounded-xl2 border border-navy-100 bg-white p-4 text-center transition hover:border-aqua-500 hover:shadow-md dark:border-navy-500 dark:bg-navy-700"
    >
      <Icon className="text-aqua-500" fontSize="large" />
      <span className="text-sm font-medium text-navy-900 dark:text-white">{label}</span>
    </button>
  );
}
