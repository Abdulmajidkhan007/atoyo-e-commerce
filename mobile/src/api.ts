import {getIdToken} from './firebase';
import type {CartItem, Review} from './types';

/**
 * SAYT API'si. Buyurtma, promokod, sharh va bekor qilish shu yerdan
 * o'tadi - narx/zaxira/promokod tekshiruvi faqat serverda bo'lishi kerak.
 * Ilova cookie ishlatolmaydi, shuning uchun Firebase ID token
 * `Authorization: Bearer ...` sarlavhasida yuboriladi (server tomonda
 * `getAppUserFromRequest` uni qabul qiladi).
 */
export const SITE_URL = 'https://atoyo-uz.netlify.app';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getIdToken();
  const response = await fetch(`${SITE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & {error?: string};
  if (!response.ok) throw new Error(data.error ?? 'Xatolik yuz berdi.');
  return data;
}

export interface DeliverySettings {
  fee: number;
  freeFrom: number;
  enabled: boolean;
}

export async function fetchDeliverySettings(): Promise<DeliverySettings> {
  const data = await request<{delivery: DeliverySettings}>('/api/delivery');
  return data.delivery;
}

export function deliveryFeeFor(settings: DeliverySettings, payable: number): number {
  if (!settings.enabled || settings.fee <= 0) return 0;
  if (settings.freeFrom > 0 && payable >= settings.freeFrom) return 0;
  return settings.fee;
}

export async function validatePromo(code: string, subtotal: number) {
  return request<{code: string; discount: number}>('/api/promo/validate', {
    method: 'POST',
    body: JSON.stringify({code, subtotal}),
  });
}

export async function createOrder(input: {
  customerName: string;
  phoneNumber: string;
  items: CartItem[];
  deliveryAddress: string | null;
  location: {latitude: number; longitude: number} | null;
  paymentMethod: 'cash' | 'online';
  promoCode: string | null;
}) {
  return request<{orderId: string}>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function cancelOrder(orderId: string) {
  return request<{ok: true}>(`/api/orders/${orderId}/cancel`, {method: 'POST'});
}

export async function fetchReviews(productId: string): Promise<Review[]> {
  const data = await request<{reviews: Review[]}>(`/api/products/${productId}/reviews`);
  return data.reviews ?? [];
}

export async function submitReview(productId: string, rating: number, comment: string) {
  return request<{ok: true}>(`/api/products/${productId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({rating, comment}),
  });
}

export async function fetchFacets(): Promise<{brands: string[]; countries: string[]}> {
  return request<{brands: string[]; countries: string[]}>('/api/facets');
}
