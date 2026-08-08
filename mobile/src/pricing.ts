import {useEffect, useState} from 'react';
import {SITE_URL} from './api';
import {useAuth} from './auth';
import type {Product, ProductVariant} from './types';

/**
 * KO'RSATILADIGAN NARX (ilova tomoni).
 *
 * MUHIM O'ZGARISH: narx endi ilovada HISOBLANMAYDI.
 *
 * Ilgari ilova katalogni Firestore'dan to'g'ridan-to'g'ri o'qirdi va
 * OPTOM narxga ustama foizini o'zi qo'shardi. Ya'ni optom narx ham,
 * ustama foizi ham qurilmaga ochiq ketardi - ustama ma'lum bo'lsa dona
 * narxdan optom narxni teskari hisoblab olish mumkin edi.
 *
 * Endi mahsulot saytning API'sidan KO'RUVCHINING ROLIGA moslangan
 * holda keladi (`/api/products/*`): `price` va `discountPrice` - bu
 * allaqachon ko'rsatiladigan narx. Shuning uchun bu funksiyalar
 * hisob qilmaydi, faqat yaxlitlaydi. Chaqiruv joylari o'zgarmasligi
 * uchun imzo (signature) avvalgidek qoldirilgan.
 */

/** Mijozga ochiq narx sozlamasi (ustama foizi BERILMAYDI). */
export interface PricingSettings {
  minOrderAmount: number;
}

const DEFAULTS: PricingSettings = {minOrderAmount: 100000};

let cache: PricingSettings | null = null;
let inflight: Promise<PricingSettings> | null = null;

async function loadPricing(): Promise<PricingSettings> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch(`${SITE_URL}/api/pricing`)
      .then(res => (res.ok ? res.json() : null))
      .then((data: {pricing?: Partial<PricingSettings>} | null) => {
        const value: PricingSettings = {
          minOrderAmount:
            typeof data?.pricing?.minOrderAmount === 'number'
              ? data.pricing.minOrderAmount
              : DEFAULTS.minOrderAmount,
        };
        cache = value;
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

/** Sozlamalar (hozircha faqat minimal buyurtma summasi). */
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

/** Narxni ko'rsatishga tayyorlaydi (server allaqachon rolga moslagan). */
export function useDisplayPrice(_product?: Pick<Product, 'id'>) {
  return (value: number) => (Number.isFinite(value) ? Math.round(value) : 0);
}

/** Ro'yxatlar uchun - xuddi shu qoida. */
export function useListPrice() {
  return (_product: Pick<Product, 'id'>, value: number) =>
    Number.isFinite(value) ? Math.round(value) : 0;
}

/** Optom mijozmi (UI da "optom" belgisi uchun). */
export function useIsWholesale(): boolean {
  const {user} = useAuth();
  return user?.role === 'client';
}

/** Turning amaldagi narxi (chegirma hisobga olingan holda). */
export function rawVariantPrice(variant: ProductVariant): number {
  const active = !!variant.discountPrice && variant.discountPrice < variant.price;
  return active ? variant.discountPrice! : variant.price;
}
