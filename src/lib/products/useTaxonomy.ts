"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { BUILTIN_TAXONOMY, type Taxonomy, type TaxonomyItem } from "./taxonomy";

/**
 * ADMIN QO'SHGAN kategoriya/material/sotish turlarini client tomonda
 * o'qish. Ilgari filtrlar, bosh sahifa va mahsulot kartochkasi kodda
 * yozilgan 8 ta standart kategoriyani bilardi - shu sababli panelda
 * yangi ochilgan kategoriya saytda ko'rinmasdi.
 *
 * Ro'yxat `/api/taxonomy` dan bir marta olinadi va modul darajasida
 * saqlanadi: sahifadagi o'nlab kartochka bitta so'rov qiladi.
 */

let cache: Taxonomy | null = null;
let inflight: Promise<Taxonomy> | null = null;
/** Ro'yxat yangilanganda qayta render bo'lishi kerak bo'lgan komponentlar. */
const listeners = new Set<(taxonomy: Taxonomy) => void>();

function load(): Promise<Taxonomy> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/taxonomy")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { taxonomy?: Taxonomy } | null) => {
        cache = data?.taxonomy ?? BUILTIN_TAXONOMY;
        listeners.forEach((listener) => listener(cache!));
        return cache;
      })
      .catch(() => BUILTIN_TAXONOMY);
  }
  return inflight;
}

/** Ro'yxatlar (hali yuklanmagan bo'lsa - standartlari). */
export function useTaxonomy(): Taxonomy {
  const [taxonomy, setTaxonomy] = useState<Taxonomy>(cache ?? BUILTIN_TAXONOMY);

  useEffect(() => {
    let cancelled = false;
    listeners.add(setTaxonomy);
    load().then((next) => {
      if (!cancelled) setTaxonomy(next);
    });
    return () => {
      cancelled = true;
      listeners.delete(setTaxonomy);
    };
  }, []);

  return taxonomy;
}

/**
 * Kategoriyalar tarjima qilingan nom bilan: standartlari lug'atdan
 * (uz/en/ru), admin qo'shganlari esa o'zi yozgan nom bilan chiqadi.
 */
export function useCategories(): TaxonomyItem[] {
  const { dict } = useI18n();
  const taxonomy = useTaxonomy();
  const translations = dict.categories as Record<string, string>;
  return taxonomy.categories.map((item) => ({
    slug: item.slug,
    label: translations[item.slug] ?? item.label,
  }));
}

/** Bitta slugning ko'rinadigan nomi (topilmasa - slugni chiroyli qilamiz). */
export function useCategoryLabel(slug: string | undefined): string {
  const categories = useCategories();
  if (!slug) return "";
  return categories.find((item) => item.slug === slug)?.label ?? prettifySlug(slug);
}

/** "yangi-kategoriya" -> "Yangi kategoriya". */
export function prettifySlug(slug: string): string {
  const text = slug.replace(/[-_]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}
