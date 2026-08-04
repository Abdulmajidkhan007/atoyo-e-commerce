"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/hooks";
import {
  DEFAULT_PRICING_SETTINGS,
  markupFor,
  priceForRole,
  productPricesForRole,
  type PricingSettings,
} from "./wholesale";
import type { Product } from "@/types/product";

/**
 * KO'RSATILADIGAN NARX (client tomonda).
 *
 * Bazadagi narx - OPTOM. Oddiy mijozga ustama qo'shilgan dona narx
 * ko'rsatiladi, optom mijozga (`role === "client"`) esa optom narx.
 * Ustama foizi `/api/pricing` dan bir marta olinadi va modul
 * darajasida keshlanadi - har kartochka uchun so'rov ketmaydi.
 */
let cache: PricingSettings | null = null;
let inflight: Promise<PricingSettings> | null = null;
const listeners = new Set<(settings: PricingSettings) => void>();

function loadSettings(): Promise<PricingSettings> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/pricing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { pricing?: PricingSettings } | null) => {
        cache = data?.pricing ?? DEFAULT_PRICING_SETTINGS;
        listeners.forEach((listener) => listener(cache!));
        return cache;
      })
      .catch(() => {
        cache = DEFAULT_PRICING_SETTINGS;
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function usePricingSettings(): PricingSettings {
  const [settings, setSettings] = useState<PricingSettings>(cache ?? DEFAULT_PRICING_SETTINGS);

  useEffect(() => {
    let active = true;
    listeners.add(setSettings);
    loadSettings().then((value) => {
      if (active) setSettings(value);
    });
    return () => {
      active = false;
      listeners.delete(setSettings);
    };
  }, []);

  return settings;
}

/**
 * Shu mahsulotning ISTALGAN optom narxini ko'rsatiladigan narxga
 * aylantiruvchi funksiya. Turlar, chegirma va "eng arzonidan" narxlari
 * ham shu funksiyadan o'tadi - qoida bitta joyda qoladi.
 */
export function useDisplayPrice(product: Pick<Product, "retailMarkupPercent">): (wholesale: number) => number {
  const role = useAppSelector((state) => state.user.profile?.role);
  const settings = usePricingSettings();
  const markup = markupFor(product, settings);
  return (wholesale: number) => priceForRole(wholesale, role, markup);
}

/** Mahsulot narxlari (asosiy + chegirma) - joriy rolga mos. */
export function useProductPrices(product: Product): { price: number; discountPrice: number | null } {
  const role = useAppSelector((state) => state.user.profile?.role);
  const settings = usePricingSettings();
  return productPricesForRole(product, role, settings);
}

/** Optom mijozmi (UI da "Optom narx" belgisi uchun). */
export function useIsWholesale(): boolean {
  return useAppSelector((state) => state.user.profile?.role) === "client";
}
