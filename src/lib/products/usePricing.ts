"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/redux/hooks";
import { isDiscountActive } from "./pricing";
import { DEFAULT_PRICING_SETTINGS } from "./wholesale";
import type { Product } from "@/types/product";

/**
 * KO'RSATILADIGAN NARX (client tomonda).
 *
 * MUHIM O'ZGARISH: narx endi client tomonda HISOBLANMAYDI.
 *
 * Ilgari brauzer mahsulotni Firestore'dan to'g'ridan-to'g'ri o'qirdi va
 * OPTOM narxga ustama foizini o'zi qo'shardi. Ya'ni optom narx ham,
 * ustama foizi ham mijozga ochiq ketardi - ustama ma'lum bo'lsa dona
 * narxdan optom narxni teskari hisoblab olish mumkin edi.
 *
 * Endi mahsulot serverdan KO'RUVCHINING ROLIGA moslangan holda keladi
 * (`lib/products/viewer.ts`): `price` va `discountPrice` - bu allaqachon
 * "ko'rsatiladigan" narx. Shuning uchun quyidagi hook'lar hisob
 * qilmaydi, faqat o'sha qiymatni qaytaradi. Chaqiruv joylari
 * o'zgarmasligi uchun imzo (signature) avvalgidek qoldirilgan.
 */

/** Mijozga ochiq narx sozlamalari (ustama foizi BERILMAYDI). */
export interface PublicPricingSettings {
  /** Buyurtmaning eng kam summasi (so'm). 0 - cheklov yo'q. */
  minOrderAmount: number;
}

const DEFAULTS: PublicPricingSettings = {
  minOrderAmount: DEFAULT_PRICING_SETTINGS.minOrderAmount,
};

let cache: PublicPricingSettings | null = null;
let inflight: Promise<PublicPricingSettings> | null = null;
const listeners = new Set<(settings: PublicPricingSettings) => void>();

function loadSettings(): Promise<PublicPricingSettings> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/pricing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { pricing?: Partial<PublicPricingSettings> } | null) => {
        const value: PublicPricingSettings = {
          minOrderAmount:
            typeof data?.pricing?.minOrderAmount === "number"
              ? data.pricing.minOrderAmount
              : DEFAULTS.minOrderAmount,
        };
        cache = value;
        listeners.forEach((listener) => listener(value));
        return value;
      })
      .catch(() => {
        cache = DEFAULTS;
        return DEFAULTS;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function usePricingSettings(): PublicPricingSettings {
  const [settings, setSettings] = useState<PublicPricingSettings>(cache ?? DEFAULTS);

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
 * Narxni ko'rsatishga tayyorlaydi.
 *
 * Serverdan kelgan qiymat allaqachon rolga mos, shuning uchun bu
 * funksiya faqat yaxlitlaydi. `product` argumenti chaqiruv joylari
 * o'zgarmasligi uchun qoldirilgan.
 */
export function useDisplayPrice(_product?: Pick<Product, "id">): (value: number) => number {
  return (value: number) => (Number.isFinite(value) ? Math.round(value) : 0);
}

/** Optom mijozmi (UI da "Optom narx" belgisi uchun). */
export function useIsWholesale(): boolean {
  return useAppSelector((state) => state.user.profile?.role) === "client";
}
