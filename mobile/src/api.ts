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

/**
 * BOSH SAHIFA NAMUNASI: 6 ta mahsulot, har kategoriyadan bittadan
 * (saytdagi bilan bir xil ro'yxat - serverda tayyorlanadi).
 */
export async function fetchShowcase(): Promise<AdminProduct[]> {
  const response = await fetch(`${SITE_URL}/api/products/showcase`);
  if (!response.ok) return [];
  const data = (await response.json()) as {products?: AdminProduct[]};
  return data.products ?? [];
}

// ---------------------------------------------------------------------------
// KATALOG. Ilova ilgari Firestore'dan TO'G'RIDAN-TO'G'RI o'qirdi, lekin
// mahsulot hujjatida OPTOM narx (`price`) va TANNARX (`costPrice`) turadi -
// ular ochiq o'qilsa raqobatchi ham ko'raverardi. Endi `products`
// kolleksiyasi Firestore qoidalarida YOPIQ va katalog saytning API'si
// orqali o'qiladi: narx serverda rolga qarab beriladi (optom mijozga
// optom, qolganlarga dona), tannarx esa umuman yuborilmaydi.
// ---------------------------------------------------------------------------

export interface CatalogFilters {
  category?: string;
  brand?: string;
  /** Material slug'i (metadata/taxonomy dagi kabi). */
  material?: string;
  /** Ishlab chiqarilgan davlat. */
  country?: string;
  /** Narx oralig'i (so'mda, KO'RSATILGAN narxda - server o'giradi). */
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'popular';
}

/** Bosh sahifa uchun eng yangi mahsulotlar. */
export async function fetchNewProducts(limit = 10): Promise<AdminProduct[]> {
  const data = await request<{products?: AdminProduct[]}>(
    `/api/products/list?sortBy=newest&pageSize=${limit}`,
  );
  return data.products ?? [];
}

/** Katalog sahifasi (filtr va saralash server tomonida). */
export async function fetchCatalog(
  filters: CatalogFilters,
  limit = 20,
  cursor?: string | null,
): Promise<{products: AdminProduct[]; nextCursor: string | null; hasMore: boolean}> {
  const params = new URLSearchParams({pageSize: String(limit)});
  if (filters.category) params.set('category', filters.category);
  if (filters.brand) params.set('brand', filters.brand);
  if (filters.material) params.set('material', filters.material);
  if (filters.country) params.set('manufacturerCountry', filters.country);
  if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
  params.set('sortBy', filters.sort ?? 'newest');
  if (cursor) params.set('cursor', cursor);

  const data = await request<{
    products?: AdminProduct[];
    nextCursor?: string | null;
    hasMore?: boolean;
  }>(`/api/products/list?${params.toString()}`);

  return {
    products: data.products ?? [],
    nextCursor: data.nextCursor ?? null,
    hasMore: Boolean(data.hasMore),
  };
}

/** Nom bo'yicha qidiruv (prefiks + so'z indeksi - saytdagi bilan bir xil). */
export async function searchProducts(term: string, limit = 20): Promise<AdminProduct[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];
  const params = new URLSearchParams({q: trimmed, pageSize: String(limit)});
  const data = await request<{products?: AdminProduct[]}>(
    `/api/products/search?${params.toString()}`,
  );
  return data.products ?? [];
}

/** Bitta mahsulot va o'xshashlari (bitta so'rovda). */
export async function fetchProductWithRelated(
  id: string,
): Promise<{product: AdminProduct; related: AdminProduct[]} | null> {
  try {
    const data = await request<{product: AdminProduct; related?: AdminProduct[]}>(
      `/api/products/${id}`,
    );
    return {product: data.product, related: data.related ?? []};
  } catch {
    return null;
  }
}

/** Sevimlilar uchun: ID lar bo'yicha (narx yangilanadi). */
export async function fetchProductsByIds(ids: string[]): Promise<AdminProduct[]> {
  if (ids.length === 0) return [];
  const params = new URLSearchParams({ids: ids.slice(0, 30).join(',')});
  const data = await request<{products?: AdminProduct[]}>(
    `/api/products/by-ids?${params.toString()}`,
  );
  return data.products ?? [];
}

export interface DeliverySettings {
  fee: number;
  freeFrom: number;
  enabled: boolean;
  /** Mijozga aytiladigan va'da (saytdagi bilan BIR XIL matn). */
  city?: string;
  freeRadiusKm?: number;
  note?: string;
  installEnabled?: boolean;
  installNote?: string;
}

/**
 * BEPUL YETKAZISH matni. Sayt `src/lib/delivery/text.ts` bilan bir xil
 * mantiq (ilova sayt kodini import qila olmaydi). Sozlama kelmasa
 * standart matn: "Qo'qon ichida va atrofdagi 15 km gacha ... bepul".
 */
export function freeDeliveryText(settings?: Partial<DeliverySettings> | null): string {
  const note = (settings?.note ?? '').trim();
  if (note) return note;
  const city = (settings?.city ?? "Qo'qon").trim();
  const radius = Math.max(0, Math.round(settings?.freeRadiusKm ?? 15));
  if (city && radius > 0) {
    return `${city} ichida va atrofdagi ${radius} km gacha yetkazib berish bepul.`;
  }
  if (city) return `${city} ichida yetkazib berish bepul.`;
  if (radius > 0) return `${radius} km gacha yetkazib berish bepul.`;
  return 'Yetkazib berish xizmati mavjud.';
}

/** O'rnatib berish xizmati (o'chirilgan bo'lsa `null`). */
export function installServiceText(settings?: Partial<DeliverySettings> | null): string | null {
  if (settings?.installEnabled === false) return null;
  const note = (settings?.installNote ?? '').trim();
  if (note) return note;
  const city = (settings?.city ?? "Qo'qon").trim();
  const near = city ? `${city} va atrofidagi mijozlarga` : 'yaqin mijozlarga';
  return `Moyka, dush kabina va shunga o'xshash mahsulotlarni o'rnatib berish xizmati bor — ${near}. Buyurtma berayotganda ayting.`;
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

/**
 * PUSH TOKEN - qurilma tokenini saqlash/o'chirish. Server uni
 * `users/{uid}.pushTokens` da saqlaydi va buyurtma holati o'zgarganda
 * shu qurilmalarga bildirishnoma yuboradi.
 */
export async function savePushToken(token: string) {
  return request<{ok: true}>('/api/profile/push-token', {
    method: 'POST',
    body: JSON.stringify({token}),
  });
}

export async function deletePushToken(token: string) {
  return request<{ok: true}>('/api/profile/push-token', {
    method: 'DELETE',
    body: JSON.stringify({token}),
  });
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
 * AI YORDAMCHI (sayt bilan bir xil `/api/assistant`). Auth talab
 * qilinmaydi - shuning uchun oddiy fetch. Yordamchi yoqilmagan bo'lsa
 * server 503 qaytaradi, ekran esa buni foydalanuvchiga aytadi.
 */
export interface AssistantProduct {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  stock: number;
}

export async function assistantEnabled(): Promise<boolean> {
  try {
    const response = await fetch(`${SITE_URL}/api/assistant`);
    const data = (await response.json()) as {enabled?: boolean};
    return Boolean(data.enabled);
  } catch {
    return false;
  }
}

/**
 * RASM BO'YICHA QIDIRUV - surat yuboriladi, katalogdan o'xshash
 * mahsulotlar qaytadi (sayt bilan bir xil `/api/search/image`).
 */
export interface ImageSearchHit {
  id: string;
  name: string;
  price: number;
  effectivePrice: number;
  stock: number;
}

export async function searchByImage(input: {
  base64: string;
  mimeType: string;
  hint?: string;
}): Promise<{description: string; products: ImageSearchHit[]}> {
  const response = await fetch(`${SITE_URL}/api/search/image`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({image: input.base64, mimeType: input.mimeType, hint: input.hint}),
  });
  const data = (await response.json().catch(() => ({}))) as {
    description?: string;
    products?: ImageSearchHit[];
    error?: string;
  };
  if (!response.ok) throw new Error(data.error ?? 'Rasmni tahlil qilib bo‘lmadi.');
  return {description: data.description ?? '', products: data.products ?? []};
}

/** Yordamchi so'ragan amal - savat ilova tomonida, shuning uchun shu yerda bajariladi. */
export interface AssistantAction {
  type: 'add_to_cart' | 'checkout';
  productId?: string;
  name?: string;
  price?: number;
  thumbnailUrl?: string;
  stock?: number;
  quantity?: number;
}

export async function askAssistant(input: {
  question: string;
  history: {role: 'user' | 'assistant'; content: string}[];
}): Promise<{answer: string; products: AssistantProduct[]; actions: AssistantAction[]}> {
  const response = await fetch(`${SITE_URL}/api/assistant`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({...input, channel: 'app'}),
  });
  const data = (await response.json().catch(() => ({}))) as {
    answer?: string;
    products?: AssistantProduct[];
    actions?: AssistantAction[];
    error?: string;
  };
  if (!response.ok || !data.answer) throw new Error(data.error ?? 'Yordamchi javob bera olmadi.');
  return {answer: data.answer, products: data.products ?? [], actions: data.actions ?? []};
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
