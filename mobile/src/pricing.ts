import {useEffect, useState} from 'react';
import {SITE_URL} from './api';
import {useAuth} from './auth';
import type {Product, ProductVariant} from './types';

/**
 * OPTOM VA DONA NARX (ilova tomoni).
 *
 * Bazadagi narx - OPTOM. Oddiy mijozga ustama qo'shilgan dona narx
 * ko'rsatiladi, optom mijozga (`role === 'client'`) esa optom narx.
 * Ustama foizi saytdagi `/api/pricing` dan olinadi va ilova ishlagan
 * davomida keshlanadi - saytdagi `lib/products/wholesale.ts` bilan
 * bir xil qoida.
 */

export interface PricingSettings {
  retailMarkupPercent: number;
  minOrderAmount: number;
}

const DEFAULTS: PricingSettings = {retailMarkupPercent: 5, minOrderAmount: 100000};

let cache: PricingSettings | null = null;
let inflight: Promise<PricingSettings> | null = null;

async function loadPricing(): Promise<PricingSettings> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch(`${SITE_URL}/api/pricing`)
      .then(res => (res.ok ? res.json() : null))
      .then((data: {pricing?: PricingSettings} | null) => {
        cache = data?.pricing ?? DEFAULTS;
        return cache;
      })
      .catch(() => {
        cache = DEFAULTS;
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Dona narx: optom × (1 + ustama%), 100 so'mgacha yaxlitlangan. */
export function retailFromWholesale(wholesale: number, markupPercent: number): number {
  if (!Number.isFinite(wholesale) || wholesale <= 0) return 0;
  return Math.round((wholesale * (1 + markupPercent / 100)) / 100) * 100;
}

/** Sozlamalarni (ustama, minimal buyurtma) o'qish. */
export function usePricingSettings(): PricingSettings {
  const [settings, setSettings] = useState<PricingSettings>(cache ?? DEFAULTS);

  useEffect(() => {
    let active = true;
    loadPricing().then(value => {
      if (active) setSettings(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return settings;
}

/**
 * Narxni rolga moslovchi funksiya. Mahsulotning o'z ustamasi bo'lsa
 * (`retailMarkupPercent`) umumiy sozlamadan ustun turadi.
 */
export function useDisplayPrice(product?: Pick<Product, 'retailMarkupPercent'>) {
  const settings = usePricingSettings();
  const isWholesale = useIsWholesale();

  const own = product?.retailMarkupPercent;
  const markup = typeof own === 'number' && own >= 0 ? own : settings.retailMarkupPercent;

  return (wholesale: number) =>
    isWholesale ? Math.round(wholesale) : retailFromWholesale(wholesale, markup);
}

/**
 * Ro'yxatlar uchun: har bir mahsulotning o'z ustamasi hisobga olinsin
 * (bitta hook bilan bir nechta mahsulot narxi ko'rsatiladi).
 */
export function useListPrice() {
  const settings = usePricingSettings();
  const isWholesale = useIsWholesale();

  return (product: Pick<Product, 'retailMarkupPercent'>, wholesale: number) => {
    if (isWholesale) return Math.round(wholesale);
    const own = product.retailMarkupPercent;
    const markup = typeof own === 'number' && own >= 0 ? own : settings.retailMarkupPercent;
    return retailFromWholesale(wholesale, markup);
  };
}

/** Optom mijozmi (UI da "optom" belgisi uchun). */
export function useIsWholesale(): boolean {
  const {user} = useAuth();
  return user?.role === 'client';
}

/** Turning narxi (chegirma hisobga olingan holda) - xom, optom qiymat. */
export function rawVariantPrice(variant: ProductVariant): number {
  const active = !!variant.discountPrice && variant.discountPrice < variant.price;
  return active ? variant.discountPrice! : variant.price;
}
