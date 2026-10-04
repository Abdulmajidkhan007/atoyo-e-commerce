import {SITE_URL} from './api';
import {buildQuery} from './query';
import type {DeliveryTextSettings} from './delivery-text';

/**
 * MA'LUMOT SAHIFALARI UCHUN SAYT API'si (Savol-javob, Yetkazib berish).
 * `api.ts` ga tegilmaydi - bu oqimning o'z fayli. Hammasi ochiq GET,
 * token kerak emas; narx yoki shaxsiy ma'lumot qaytmaydi.
 */

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${SITE_URL}${path}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/** Til: ruscha bo'lsa `ru`, qolgani o'zbekcha (sayt bilan bir xil qoida). */
export async function fetchFaq(locale: string): Promise<FaqEntry[]> {
  const query = buildQuery({locale: locale === 'ru' ? 'ru' : 'uz'});
  const data = await getJson<{items?: FaqEntry[]}>(`/api/content/faq?${query}`);
  return data.items ?? [];
}

export interface DeliveryZoneInfo {
  id: string;
  name: string;
  fee: number;
  freeFrom?: number;
}

export interface DeliveryInfo {
  delivery: DeliveryTextSettings & {zones?: DeliveryZoneInfo[]; pageText?: string};
  minOrderAmount: number;
  transferEnabled: boolean;
  onlineEnabled: boolean;
}

/** `/yetkazib-berish` sahifasi uchun hamma ma'lumot (3 ta ochiq API). */
export async function fetchDeliveryInfo(): Promise<DeliveryInfo> {
  const [delivery, payment, pricing] = await Promise.all([
    getJson<{delivery?: DeliveryInfo['delivery']}>('/api/delivery'),
    getJson<{transfer?: unknown; online?: boolean}>('/api/payment-info'),
    getJson<{pricing?: {minOrderAmount?: number}}>('/api/pricing').catch(() => ({pricing: undefined})),
  ]);
  return {
    delivery: delivery.delivery ?? {fee: 0, freeFrom: 0, enabled: false},
    minOrderAmount: pricing.pricing?.minOrderAmount ?? 0,
    transferEnabled: Boolean(payment.transfer),
    onlineEnabled: Boolean(payment.online),
  };
}
