import {getIdToken} from './firebase';
import type {CartItem, Product as AdminProduct, Review} from './types';

/**
 * SAYT API'si. Buyurtma, promokod, sharh va bekor qilish shu yerdan
 * o'tadi - narx/zaxira/promokod tekshiruvi faqat serverda bo'lishi kerak.
 * Ilova cookie ishlatolmaydi, shuning uchun Firebase ID token
 * `Authorization: Bearer ...` sarlavhasida yuboriladi (server tomonda
 * `getAppUserFromRequest` uni qabul qiladi).
 */
export const SITE_URL = 'https://atoyo-uz.web.app';

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

// ---------------------------------------------------------------------------
// ADMIN (xodimlar uchun). Barchasi saytdagi bir xil route'larga boradi va
// `Authorization: Bearer <ID token>` bilan tekshiriladi.
// ---------------------------------------------------------------------------

/** Buyurtma statusini o'zgartirish (guruhga xabar ham shu yerdan ketadi). */
export async function adminSetOrderStatus(orderId: string, status: string) {
  return request<{ok: true}>(`/api/admin/orders/${orderId}/status`, {
    method: 'POST',
    body: JSON.stringify({status}),
  });
}

/** Admin qidiruvi - chernoviklarni ham topadi. */
export async function adminSearchProducts(term: string): Promise<AdminProduct[]> {
  const data = await request<{products: AdminProduct[]}>(
    `/api/admin/products/search?q=${encodeURIComponent(term)}`,
  );
  return data.products ?? [];
}

/** Mahsulot kirimi (zaxira qo'shish). */
export async function adminIntake(items: AdminIntakeItem[]) {
  return request<{ok: true; updated: number}>('/api/admin/products/intake', {
    method: 'POST',
    body: JSON.stringify({items}),
  });
}

/** Tez tahrir: narx, zaxira yoki ko'rinishini o'zgartirish. */
export async function adminUpdateProduct(
  productId: string,
  patch: {price?: number; stock?: number; isActive?: boolean},
) {
  return request<{product: AdminProduct}>(`/api/admin/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/** Dashboard raqamlari va eng ko'p sotilganlar. */
export async function adminStats(): Promise<{
  stats: {totalOrders: number; totalRevenue: number};
  topProducts: {id: string; name: string; code: number | null; salesCount: number; price: number}[];
}> {
  return request('/api/admin/stats');
}

/** Blog: barcha maqolalar (chernoviklar ham). */
export async function adminBlogPosts(): Promise<AdminBlogPost[]> {
  const data = await request<{posts: AdminBlogPost[]}>('/api/admin/blog');
  return data.posts ?? [];
}

/** Maqolani chop etish / chernovikka qaytarish. */
export async function adminSetPostPublished(postId: string, isPublished: boolean) {
  return request<{ok: true}>(`/api/admin/blog/${postId}`, {
    method: 'PATCH',
    body: JSON.stringify({isPublished}),
  });
}

/** Promokodlar ro'yxati. */
export async function adminPromoCodes(): Promise<AdminPromo[]> {
  const data = await request<{promos: AdminPromo[]}>('/api/admin/promo');
  return data.promos ?? [];
}

/** Yangi promokod. */
export async function adminCreatePromo(input: {
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
}) {
  return request<{ok: true}>('/api/admin/promo', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Foydalanuvchilar ro'yxati (faqat ko'rish). */
export async function adminUsers(): Promise<AdminUser[]> {
  const data = await request<{users: AdminUser[]}>('/api/admin/users');
  return data.users ?? [];
}

export interface AdminBlogPost {
  id: string;
  title: string;
  excerpt?: string;
  isPublished: boolean;
  createdAt?: number;
}

export interface AdminPromo {
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  usedCount?: number;
  isActive: boolean;
}

export interface AdminUser {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  role?: string;
  ordersCount?: number;
  totalSpent?: number;
}

export interface AdminIntakeItem {
  productId: string;
  variantId?: string;
  qty: number;
  price?: number;
  supplier?: string;
}

export interface TaxonomyItem {
  slug: string;
  label: string;
}

/** Kategoriya/material/sotish turi ro'yxatlari (saytdagi bilan bir xil). */
export async function fetchTaxonomy(): Promise<{
  categories: TaxonomyItem[];
  materials: TaxonomyItem[];
}> {
  const data = await request<{
    taxonomy?: {categories?: TaxonomyItem[]; materials?: TaxonomyItem[]};
  }>('/api/taxonomy');
  return {
    categories: data.taxonomy?.categories ?? [],
    materials: data.taxonomy?.materials ?? [],
  };
}

/** Kontakt formasi - saytdagi bilan bir xil route (xodimlar guruhiga tushadi). */
export async function sendContactRequest(input: {name: string; phone: string; question: string}) {
  return request<{ok: true}>('/api/contact', {method: 'POST', body: JSON.stringify(input)});
}

/** Yangiliklarga obuna. */
export async function subscribeToNewsletter(email: string) {
  return request<{ok: true}>('/api/subscribe', {method: 'POST', body: JSON.stringify({email})});
}

/** Chek sahifasi - brauzerda ochiladi (PDF/chop etish saytda). */
export function receiptUrl(orderId: string): string {
  return `${SITE_URL}/chek/${orderId}`;
}

/**
 * TELEGRAM ORQALI KIRISH (deep link). Bu ikki route auth talab
 * qilmaydi - shuning uchun `request` emas, to'g'ridan-to'g'ri fetch.
 */
export async function startTelegramLogin(): Promise<{code: string; url: string}> {
  const response = await fetch(`${SITE_URL}/api/auth/telegram/start`, {method: 'POST'});
  const data = (await response.json().catch(() => ({}))) as {code?: string; url?: string};
  if (!response.ok || !data.code || !data.url) throw new Error('Telegram kirishni boshlab bo‘lmadi.');
  return {code: data.code, url: data.url};
}

export type TelegramExchange = {state: 'pending'} | {state: 'ready'; token: string};

export async function exchangeTelegramCode(code: string): Promise<TelegramExchange> {
  const response = await fetch(`${SITE_URL}/api/auth/telegram/exchange`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({code}),
  });
  if (response.status === 202) return {state: 'pending'};
  const data = (await response.json().catch(() => ({}))) as {token?: string};
  if (!response.ok || !data.token) throw new Error('Telegram kodi eskirgan.');
  return {state: 'ready', token: data.token};
}
