"use client";

import { useState } from "react";
import { MenuItem, Select, TextField, Button, InputLabel, FormControl } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setFilters, resetFilters } from "@/redux/slices/filterSlice";
import { useTranslation } from "@/i18n/I18nProvider";
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

const MATERIAL_VALUES: ProductMaterial[] = [
  "polypropylene",
  "metal-plastic",
  "steel",
  "copper",
  "brass",
  "cast-iron",
  "pvc",
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
  const t = useTranslation();
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
        <h2 className="font-semibold text-navy-900 dark:text-white">{t.filters.title}</h2>
        <Button size="small" onClick={() => { dispatch(resetFilters()); setMinPrice(""); setMaxPrice(""); }}>
          {t.filters.clear}
        </Button>
      </div>

      <FormControl size="small" fullWidth>
        <InputLabel id="category-label">{t.filters.category}</InputLabel>
        <Select
          labelId="category-label"
          label={t.filters.category}
          value={filters.category ?? ""}
          onChange={(e) => dispatch(setFilters({ category: (e.target.value || undefined) as ProductCategory | undefined }))}
        >
          <MenuItem value="">{t.common.all}</MenuItem>
          {CATEGORY_VALUES.map((value) => (
            <MenuItem key={value} value={value}>{t.categories[value]}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth>
        <InputLabel id="material-label">{t.filters.material}</InputLabel>
        <Select
          labelId="material-label"
          label={t.filters.material}
          value={filters.material ?? ""}
          onChange={(e) => dispatch(setFilters({ material: (e.target.value || undefined) as ProductMaterial | undefined }))}
        >
          <MenuItem value="">{t.common.all}</MenuItem>
          {MATERIAL_VALUES.map((value) => (
            <MenuItem key={value} value={value}>{t.materials[value]}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth>
        <InputLabel id="brand-label">{t.filters.brand}</InputLabel>
        <Select
          labelId="brand-label"
          label={t.filters.brand}
          value={filters.brand ?? ""}
          onChange={(e) => dispatch(setFilters({ brand: e.target.value || undefined }))}
        >
          <MenuItem value="">{t.common.all}</MenuItem>
          {BRAND_OPTIONS.map((brand) => (
            <MenuItem key={brand} value={brand}>{brand}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth>
        <InputLabel id="country-label">{t.filters.country}</InputLabel>
        <Select
          labelId="country-label"
          label={t.filters.country}
          value={filters.manufacturerCountry ?? ""}
          onChange={(e) => dispatch(setFilters({ manufacturerCountry: e.target.value || undefined }))}
        >
          <MenuItem value="">{t.common.all}</MenuItem>
          {COUNTRY_OPTIONS.map((country) => (
            <MenuItem key={country} value={country}>{country}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <div>
        <p className="mb-1 text-sm text-navy-500 dark:text-navy-100">{t.filters.priceRange} ({t.common.currencyUzs})</p>
        <div className="flex items-center gap-2">
          <TextField size="small" type="number" placeholder={t.filters.priceFrom} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} onBlur={applyPriceRange} />
          <TextField size="small" type="number" placeholder={t.filters.priceTo} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} onBlur={applyPriceRange} />
        </div>
      </div>

      <FormControl size="small" fullWidth>
        <InputLabel id="sort-label">{t.filters.sort}</InputLabel>
        <Select
          labelId="sort-label"
          label={t.filters.sort}
          value={filters.sortBy ?? "newest"}
          onChange={(e) => dispatch(setFilters({ sortBy: e.target.value as typeof filters.sortBy }))}
        >
          <MenuItem value="newest">{t.filters.sortNewest}</MenuItem>
          <MenuItem value="price-asc">{t.filters.sortPriceAsc}</MenuItem>
          <MenuItem value="price-desc">{t.filters.sortPriceDesc}</MenuItem>
        </Select>
      </FormControl>
    </aside>
  );
}
