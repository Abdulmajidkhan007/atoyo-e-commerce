"use client";

import { useState } from "react";
import { MenuItem, Select, TextField, Button, InputLabel, FormControl } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setFilters, resetFilters } from "@/redux/slices/filterSlice";
import { useI18n } from "@/lib/i18n/LocaleContext";
import type { ProductCategory, ProductMaterial } from "@/types/product";

const CATEGORY_VALUES: ProductCategory[] = [
  "pipes",
  "fittings",
  "faucets",
  "shower-systems",
  "boilers",
  "radiators",
  "pumps",
  "sanitary-ware",
];

const MATERIAL_OPTIONS: { value: ProductMaterial; label: string }[] = [
  { value: "polypropylene", label: "Polipropilen" },
  { value: "metal-plastic", label: "Metalplastik" },
  { value: "steel", label: "Po'lat" },
  { value: "copper", label: "Mis" },
  { value: "brass", label: "Latun" },
  { value: "cast-iron", label: "Cho'yan" },
  { value: "pvc", label: "PVX" },
];

// TODO (masshtablash): brend va ishlab chiqaruvchi davlat ro'yxati 10,000+
// mahsulot orasida dinamik bo'lishi kerak - production'da bu ro'yxat
// Cloud Function orqali alohida `metadata/facets` hujjatida saqlanadi va
// har mahsulot qo'shilganda/o'chirilganda yangilanadi (butun katalogni
// skanerlashdan qochish uchun). Hozircha eng ko'p uchraydigan qiymatlar bilan.
const BRAND_OPTIONS = ["Kalde", "Valtec", "STOUT", "Icma", "Ferro", "Rehau"];
const COUNTRY_OPTIONS = ["O'zbekiston", "Turkiya", "Germaniya", "Italiya", "Xitoy", "Rossiya"];

export function FilterPanel() {
  const dispatch = useAppDispatch();
  const { dict } = useI18n();
  const filters = useAppSelector((s) => s.filters);
  const [minPrice, setMinPrice] = useState(filters.minPrice?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice?.toString() ?? "");

  const applyPriceRange = () => {
    dispatch(
      setFilters({
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      })
    );
  };

  return (
    <aside className="flex w-full flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700 lg:w-64 lg:shrink-0">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-navy-900 dark:text-white">{dict.filters.title}</h2>
        <Button size="small" onClick={() => { dispatch(resetFilters()); setMinPrice(""); setMaxPrice(""); }}>
          {dict.filters.clear}
        </Button>
      </div>

      <FormControl size="small" fullWidth>
        <InputLabel id="category-label">{dict.home.categories}</InputLabel>
        <Select
          labelId="category-label"
          label={dict.home.categories}
          value={filters.category ?? ""}
          onChange={(e) => dispatch(setFilters({ category: (e.target.value || undefined) as ProductCategory | undefined }))}
        >
          <MenuItem value="">{dict.filters.all}</MenuItem>
          {CATEGORY_VALUES.map((value) => (
            <MenuItem key={value} value={value}>{dict.categories[value]}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth>
        <InputLabel id="material-label">{dict.filters.material}</InputLabel>
        <Select
          labelId="material-label"
          label={dict.filters.material}
          value={filters.material ?? ""}
          onChange={(e) => dispatch(setFilters({ material: (e.target.value || undefined) as ProductMaterial | undefined }))}
        >
          <MenuItem value="">{dict.filters.all}</MenuItem>
          {MATERIAL_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth>
        <InputLabel id="brand-label">{dict.filters.brand}</InputLabel>
        <Select
          labelId="brand-label"
          label={dict.filters.brand}
          value={filters.brand ?? ""}
          onChange={(e) => dispatch(setFilters({ brand: e.target.value || undefined }))}
        >
          <MenuItem value="">{dict.filters.all}</MenuItem>
          {BRAND_OPTIONS.map((brand) => (
            <MenuItem key={brand} value={brand}>{brand}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth>
        <InputLabel id="country-label">{dict.filters.country}</InputLabel>
        <Select
          labelId="country-label"
          label={dict.filters.country}
          value={filters.manufacturerCountry ?? ""}
          onChange={(e) => dispatch(setFilters({ manufacturerCountry: e.target.value || undefined }))}
        >
          <MenuItem value="">{dict.filters.all}</MenuItem>
          {COUNTRY_OPTIONS.map((country) => (
            <MenuItem key={country} value={country}>{country}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <div>
        <p className="mb-1 text-sm text-navy-500 dark:text-navy-100">{dict.filters.priceRange}</p>
        <div className="flex items-center gap-2">
          <TextField size="small" type="number" placeholder={dict.filters.from} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} onBlur={applyPriceRange} />
          <TextField size="small" type="number" placeholder={dict.filters.to} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} onBlur={applyPriceRange} />
        </div>
      </div>

      <FormControl size="small" fullWidth>
        <InputLabel id="sort-label">{dict.filters.sort}</InputLabel>
        <Select
          labelId="sort-label"
          label={dict.filters.sort}
          value={filters.sortBy ?? "newest"}
          onChange={(e) => dispatch(setFilters({ sortBy: e.target.value as typeof filters.sortBy }))}
        >
          <MenuItem value="newest">{dict.filters.newest}</MenuItem>
          <MenuItem value="price-asc">{dict.filters.priceAsc}</MenuItem>
          <MenuItem value="price-desc">{dict.filters.priceDesc}</MenuItem>
        </Select>
      </FormControl>
    </aside>
  );
}
