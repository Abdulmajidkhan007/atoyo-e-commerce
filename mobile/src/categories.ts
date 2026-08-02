import {useEffect, useState} from 'react';
import {useI18n} from './i18n';
import {fetchTaxonomy, type TaxonomyItem} from './api';
import {CATEGORY_KEYS} from './types';

/**
 * KATEGORIYALAR ro'yxati - saytdagi `/api/taxonomy` dan. Ilgari ilova
 * kodda yozilgan 8 ta standart kategoriyani bilardi, shu sababli admin
 * panelda ochilgan yangi kategoriya ilovada ko'rinmasdi.
 *
 * Ro'yxat bir marta olinadi va modul darajasida saqlanadi (bosh sahifa
 * va katalog bitta so'rov qiladi). Internet bo'lmasa standartlari
 * ko'rinadi.
 */

const FALLBACK: TaxonomyItem[] = CATEGORY_KEYS.map(slug => ({slug, label: slug}));

let cache: TaxonomyItem[] | null = null;
let inflight: Promise<TaxonomyItem[]> | null = null;

function load(): Promise<TaxonomyItem[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetchTaxonomy()
      .then(taxonomy => {
        cache = taxonomy.categories.length > 0 ? taxonomy.categories : FALLBACK;
        return cache;
      })
      .catch(() => {
        inflight = null;
        return FALLBACK;
      });
  }
  return inflight;
}

/**
 * Ko'rinadigan nom bilan: standart kategoriyalar tarjimadan (uz/en/ru),
 * admin qo'shganlari esa o'zi yozgan nom bilan chiqadi.
 */
export function useCategories(): TaxonomyItem[] {
  const {t} = useI18n();
  const [items, setItems] = useState<TaxonomyItem[]>(cache ?? FALLBACK);

  useEffect(() => {
    let active = true;
    load().then(next => {
      if (active) setItems(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const labels = t.categoryLabels as Record<string, string | undefined>;
  return items.map(item => ({
    slug: item.slug,
    label: labels[item.slug] ?? item.label,
  }));
}
