"use client";

import { useEffect, useState } from "react";
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

// Brend/davlat ro'yxati DINAMIK: mahsulot qo'shilganda `metadata/facets`
// hujjatiga yig'iladi (lib/products/facets.ts) va shu yerda /api/facets
// orqali o'qiladi - butun katalogni skanerlash shart emas. Ro'yxat hali
// bo'sh bo'lsa (eski mahsulotlar) quyidagi standart qiymatlar ko'rinadi.
const FALLBACK_BRANDS = ["Kalde", "Valtec", "STOUT", "Icma", "Ferro", "Rehau"];
const FALLBACK_COUNTRIES = ["O'zbekiston", "Turkiya", "Germaniya", "Italiya", "Xitoy", "Rossiya"];

/**
 * Filtrlar. `variant="plain"` - o'rab turuvchi ramkasiz (modal ichida
 * ishlatiladi), standart `"sidebar"` - o'z kartochkasi bilan.
 */
export function FilterPanel({ variant = "sidebar" }: { variant?: "sidebar" | "plain" }) {
  const dispatch = useAppDispatch();
  const { dict } = useI18n();
  const filters = useAppSelector((s) => s.filters);
  const [minPrice, setMinPrice] = useState(filters.minPrice?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice?.toString() ?? "");
  const [brandOptions, setBrandOptions] = useState<string[]>(FALLBACK_BRANDS);
  const [countryOptions, setCountryOptions] = useState<string[]>(FALLBACK_COUNTRIES);

  useEffect(() => {
    let cancelled = false;
    async function loadFacets() {
      try {
        const res = await fetch("/api/facets");
        if (!res.ok) return;
        const data = (await res.json()) as { brands?: string[]; countries?: string[] };
        if (cancelled) return;
        if (data.brands?.length) setBrandOptions(data.brands);
        if (data.countries?.length) setCountryOptions(data.countries);
      } catch {
        // Facet o'qilmasa standart ro'yxat qoladi.
      }
    }
    loadFacets();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyPriceRange = () => {
    dispatch(
      setFilters({
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      })
    );
  };

  const Wrapper = variant === "plain" ? "div" : "aside";

  return (
    <Wrapper
      className={
        variant === "plain"
          ? "flex w-full flex-col gap-4"
          : "flex w-full flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700 lg:w-64 lg:shrink-0"
      }
    >
      <div className="flex items-center justify-between">
        {variant === "sidebar" && (
          <h2 className="font-semibold text-navy-900 dark:text-white">{dict.filters.title}</h2>
        )}
        <Button
          size="small"
          className={variant === "plain" ? "!ml-auto" : undefined}
          onClick={() => { dispatch(resetFilters()); setMinPrice(""); setMaxPrice(""); }}
        >
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
          {brandOptions.map((brand) => (
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
          {countryOptions.map((country) => (
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
    </Wrapper>
  );
}
