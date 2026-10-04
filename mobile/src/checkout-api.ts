import AsyncStorage from '@react-native-async-storage/async-storage';
import {getIdToken} from './firebase';
import {buildQuery} from './query';
import {SITE_URL} from './api';
import type {DeliveryZoneLite} from './delivery-text';
import type {CartItem, Product} from './types';

/**
 * XARID OQIMI API'si (AUDIT-ISHLARI 15, B oqimi): 1 klikda buyurtma,
 * kartaga o'tkazma + chek, bepul yetkazish tavsiyalari, xususiyatlar.
 *
 * `api.ts` ga qo'shilmagan — uch oqim parallel ishlagani uchun har
 * oqim o'z faylida (spetsifikatsiya 3-bo'lim). Hamma narx va summa
 * SERVERDAN keladi; ilova faqat ko'rsatadi (CLAUDE.md 1-band).
 */

/** Saytdagi `MAX_GUEST_ITEMS` (`lib/orders/order-schema.ts`) bilan bir xil. */
export const MAX_GUEST_ITEMS = 20;
/** Mehmon buyurtmasida bitta qatorning eng ko'p soni (server sxemasi). */
export const MAX_GUEST_QUANTITY = 99;
/** Chek hajmi chegarasi (saytdagi `MAX_RECEIPT_BYTES`). */
export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken().catch(() => null);
  return token ? {Authorization: `Bearer ${token}`} : {};
}

async function postJson<T>(path: string, body: unknown): Promise<{status: number; data: T & {error?: string}}> {
  const response = await fetch(`${SITE_URL}${path}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', ...(await authHeaders())},
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & {error?: string};
  if (!response.ok) throw new Error(data.error ?? 'Xatolik yuz berdi.');
  return {status: response.status, data};
}

// ---------------------------------------------------------------------------
// Sozlamalar: to'lov usullari va yetkazish hududlari
// ---------------------------------------------------------------------------

export interface TransferCard {
  cardNumber: string;
  cardHolder: string;
  bankName: string;
  note: string;
}

/**
 * To'lov usullari (`/api/payment-info`): kartaga o'tkazma — faqat
 * sozlamada YOQILGAN bo'lsa karta keladi (aks holda `null`); onlayn
 * (Payme/Click) — faqat kalitlar ulangan bo'lsa `true`. Ilgari ilova
 * "Onlayn" ni doim ko'rsatardi va mijoz to'lab bo'lmaydigan buyurtma
 * berardi (tekshiruvchi).
 */
export async function fetchPaymentMethods(): Promise<{card: TransferCard | null; online: boolean}> {
  try {
    const response = await fetch(`${SITE_URL}/api/payment-info`);
    if (!response.ok) return {card: null, online: false};
    const data = (await response.json()) as {transfer?: TransferCard | null; online?: boolean};
    return {card: data.transfer?.cardNumber ? data.transfer : null, online: data.online === true};
  } catch {
    return {card: null, online: false};
  }
}

/** Kartaga o'tkazma — faqat sozlamada YOQILGAN bo'lsa karta keladi, aks holda `null`. */
export async function fetchTransferCard(): Promise<TransferCard | null> {
  return (await fetchPaymentMethods()).card;
}

export interface CheckoutDelivery {
  enabled: boolean;
  fee: number;
  freeFrom: number;
  zones: DeliveryZoneLite[];
}

/** `/api/delivery` — hududlar bilan (api.ts dagi `DeliverySettings` da `zones` yo'q). */
export async function fetchCheckoutDelivery(): Promise<CheckoutDelivery> {
  const response = await fetch(`${SITE_URL}/api/delivery`);
  const data = (await response.json().catch(() => ({}))) as {delivery?: Partial<CheckoutDelivery>};
  const d = data.delivery ?? {};
  return {
    enabled: Boolean(d.enabled),
    fee: Number(d.fee) || 0,
    freeFrom: Number(d.freeFrom) || 0,
    zones: Array.isArray(d.zones) ? d.zones : [],
  };
}

// ---------------------------------------------------------------------------
// Buyurtma
// ---------------------------------------------------------------------------

export type PaymentChoice = 'cash' | 'online' | 'transfer';

interface OrderLineInput {
  productId: string;
  variantId?: string | null;
  name: string;
  price: number;
  quantity: number;
  thumbnailUrl: string;
}

function toLines(items: (CartItem | OrderLineInput)[]): OrderLineInput[] {
  return items.map(item => ({
    productId: item.productId,
    variantId: item.variantId ?? null,
    name: item.name,
    // Narx serverda QAYTA hisoblanadi — bu faqat sxema uchun.
    price: item.price,
    quantity: item.quantity,
    thumbnailUrl: item.thumbnailUrl,
  }));
}

export interface OrderResult {
  orderId: string;
  /** Buyurtma kaliti — faqat qurilmada saqlanadi (`saveOrderAccess`). */
  accessToken: string;
}

/**
 * Kirgan mijozning buyurtmasi (`/api/orders`) — o'tkazma va hudud bilan.
 * `api.ts` dagi `createOrder` o'tkazma va kalitni bilmaydi.
 */
export async function submitOrder(input: {
  customerName: string;
  phoneNumber: string;
  items: CartItem[];
  deliveryAddress: string | null;
  paymentMethod: PaymentChoice;
  promoCode: string | null;
  deliveryZoneId: string | null;
}): Promise<OrderResult> {
  const {data} = await postJson<{orderId?: string; accessToken?: string}>('/api/orders', {
    ...input,
    location: null,
    items: toLines(input.items),
  });
  if (!data.orderId) throw new Error('Buyurtmani saqlashda xatolik yuz berdi.');
  return {orderId: data.orderId, accessToken: data.accessToken ?? ''};
}

/**
 * "1 KLIKDA" / "Ro'yxatdan o'tmasdan" — `/api/orders/quick` (mehmon).
 * Server bot tuzog'iga tushgan so'rovga raqamsiz `{received: true}`
 * qaytaradi — shunda natija `null`.
 */
export async function submitQuickOrder(input: {
  customerName: string;
  phoneNumber: string;
  deliveryAddress: string;
  paymentMethod: 'cash' | 'transfer';
  deliveryZoneId: string | null;
  items: (CartItem | OrderLineInput)[];
}): Promise<OrderResult | null> {
  const {data} = await postJson<{orderId?: string; accessToken?: string; received?: boolean}>(
    '/api/orders/quick',
    {...input, website: '', items: toLines(input.items)},
  );
  if (!data.orderId) {
    if (data.received) return null;
    throw new Error('Buyurtmani saqlashda xatolik yuz berdi.');
  }
  return {orderId: data.orderId, accessToken: data.accessToken ?? ''};
}

export interface OrderPaymentState {
  id: string;
  status: string;
  totalAmount: number;
  paymentMethod: PaymentChoice;
  paymentStatus: 'not_required' | 'pending' | 'paid' | 'failed';
  hasReceipt: boolean;
  receiptCount: number;
}

/** Buyurtmaning to'lov holati — summa SERVERDAN (`/api/orders/<id>/payment`). */
export async function fetchOrderPayment(orderId: string, token: string): Promise<OrderPaymentState> {
  const query = token ? `?${buildQuery({t: token})}` : '';
  const response = await fetch(`${SITE_URL}/api/orders/${encodeURIComponent(orderId)}/payment${query}`, {
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => ({}))) as {order?: OrderPaymentState; error?: string};
  if (!response.ok || !data.order) throw new Error(data.error ?? 'Buyurtma topilmadi.');
  return data.order;
}

export interface ReceiptFile {
  uri: string;
  type: string;
  name: string;
  /** Bayt — tanlagich beradi; 8 MB dan oshsa yuborilmaydi. */
  size?: number;
}

/** Server holat kodi → mijozga tushunarli o'zbekcha sabab. */
export function receiptErrorMessage(status: number, serverMessage?: string): string {
  if (status === 411) {
    return "Fayl hajmini aniqlab bo'lmadi. Chekni galereyadan qayta tanlang (skrinshot yoki rasm).";
  }
  if (status === 413) return 'Fayl 8 MB dan oshmasin. Kichikroq rasm tanlang.';
  if (status === 404) return 'Buyurtma topilmadi yoki havola eskirgan. Bizga qo‘ng‘iroq qiling.';
  if (status === 429) return serverMessage || 'Juda ko‘p urinish. Bizga qo‘ng‘iroq qiling.';
  return serverMessage || 'Chekni yuklab bo‘lmadi. Qayta urinib ko‘ring.';
}

/**
 * CHEK YUKLASH — multipart, kalit MANZILDA (`?t=`): server uni tanani
 * o'qishdan OLDIN tekshiradi.
 *
 * `Content-Length` SHART (aks holda server 411 qaytaradi). React Native
 * `FormData` dagi `file://` qism uchun hajmni fayldan o'zi hisoblaydi va
 * sarlavhani qo'yadi (image-picker faylni ilova keshiga ko'chiradi,
 * shuning uchun URI doim `file://`). 411 kelsa ham mijozga aniq sabab
 * aytiladi. Kalit loglarga YOZILMAYDI.
 */
export async function uploadReceipt(orderId: string, token: string, file: ReceiptFile): Promise<void> {
  if (file.size !== undefined && file.size > MAX_RECEIPT_BYTES) {
    throw new Error(receiptErrorMessage(413));
  }
  const form = new FormData();
  // RN FormData fayl qismi: {uri, type, name}.
  form.append('file', {uri: file.uri, type: file.type, name: file.name} as unknown as Blob);
  const query = token ? `?${buildQuery({t: token})}` : '';
  const response = await fetch(`${SITE_URL}/api/orders/${encodeURIComponent(orderId)}/receipt${query}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: form,
  });
  const data = (await response.json().catch(() => ({}))) as {error?: string};
  if (!response.ok) throw new Error(receiptErrorMessage(response.status, data.error));
}

// ---------------------------------------------------------------------------
// Buyurtma kaliti — FAQAT shu qurilmada (AsyncStorage)
// ---------------------------------------------------------------------------

const ACCESS_KEY = 'atoyo:order-access';
/** Eng ko'p nechta buyurtma kaliti saqlanadi (eskilari tashlanadi). */
const MAX_SAVED = 30;

interface SavedAccess {
  orderId: string;
  token: string;
  savedAt: number;
}

async function readAccess(): Promise<SavedAccess[]> {
  try {
    const raw = await AsyncStorage.getItem(ACCESS_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedAccess[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Kalit serverga faqat to'lov holati va chek yuklash so'rovida
 * yuboriladi. Mehmon ilovani yopib ochsa ham to'lov ekraniga qaytishi
 * mumkin bo'lsin — shuning uchun qurilmada saqlanadi.
 */
export async function saveOrderAccess(orderId: string, token: string): Promise<void> {
  if (!token) return;
  const list = (await readAccess()).filter(item => item.orderId !== orderId);
  list.unshift({orderId, token, savedAt: Date.now()});
  await AsyncStorage.setItem(ACCESS_KEY, JSON.stringify(list.slice(0, MAX_SAVED))).catch(() => {});
}

export async function getOrderAccess(orderId: string): Promise<string> {
  return (await readAccess()).find(item => item.orderId === orderId)?.token ?? '';
}

/** Shu qurilmadan berilgan buyurtmalar (eng yangisi birinchi) — mehmon uchun. */
export async function listSavedOrders(): Promise<{orderId: string; savedAt: number}[]> {
  return (await readAccess()).map(({orderId, savedAt}) => ({orderId, savedAt}));
}

// ---------------------------------------------------------------------------
// Savat: bepul yetkazishgacha farqni yopadigan mahsulotlar
// ---------------------------------------------------------------------------

/**
 * `/api/products/gap-fillers` — javob `toViewerProducts()` dan o'tgan
 * (narx rolga mos), shuning uchun token yuboriladi. So'rov qatori
 * `buildQuery` bilan (CLAUDE.md 13: Hermes'dagi standart klass to'liq emas).
 */
export async function fetchGapFillers(input: {
  gap: number;
  exclude: string[];
  categories: string[];
}): Promise<Product[]> {
  try {
    const query = buildQuery({
      gap: Math.round(input.gap),
      exclude: input.exclude.join(','),
      categories: input.categories.join(','),
    });
    const response = await fetch(`${SITE_URL}/api/products/gap-fillers?${query}`, {
      headers: await authHeaders(),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as {products?: Product[]};
    return data.products ?? [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Xususiyatlar uchun nomlar (kategoriya / material / sotish turi)
// ---------------------------------------------------------------------------

export interface SpecTaxonomy {
  categories: {slug: string; label: string}[];
  materials: {slug: string; label: string}[];
  units: {slug: string; label: string}[];
}

let taxonomyCache: Promise<SpecTaxonomy> | null = null;

/** `/api/taxonomy` — sotish turi (`units`) bilan; bir marta o'qiladi. */
export function fetchSpecTaxonomy(): Promise<SpecTaxonomy> {
  if (!taxonomyCache) {
    taxonomyCache = fetch(`${SITE_URL}/api/taxonomy`)
      .then(response => response.json())
      .then((data: {taxonomy?: Partial<SpecTaxonomy>}) => ({
        categories: data.taxonomy?.categories ?? [],
        materials: data.taxonomy?.materials ?? [],
        units: data.taxonomy?.units ?? [],
      }))
      .catch(() => {
        taxonomyCache = null;
        return {categories: [], materials: [], units: []};
      });
  }
  return taxonomyCache;
}
