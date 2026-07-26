import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import type {Order, Product, ProductCategory} from './types';

/**
 * Firebase - @react-native-firebase orqali. Sozlash fayllari:
 *   android/app/google-services.json  va  ios/GoogleService-Info.plist
 * (Firebase konsolidan yuklab olinadi - README'da tartib bor).
 *
 * Katalogni ilova to'g'ridan-to'g'ri Firestore'dan o'qiydi (qoidalarda
 * `products` ochiq). Buyurtma esa saytning API'si orqali beriladi -
 * narx va zaxira tekshiruvi bitta joyda (serverda) qolishi uchun.
 */

const PAGE = 20;

export function productsCollection() {
  return firestore().collection('products');
}

/** Bosh sahifa uchun eng yangi mahsulotlar. */
export async function fetchNewProducts(limit = 10): Promise<Product[]> {
  const snap = await productsCollection()
    .where('isActive', '==', true)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map(d => ({id: d.id, ...d.data()}) as Product);
}

export interface CatalogFilters {
  category?: ProductCategory;
  brand?: string;
  sort?: 'newest' | 'price-asc' | 'price-desc';
}

/**
 * Katalog sahifasi. Kompozit indeks bo'lmasa (yangi filtr kombinatsiyasi)
 * so'rov xato beradi - bunday holda saralashsiz olib, xotirada
 * tartiblaymiz, ya'ni ekran hech qachon bo'sh qolmaydi.
 */
export async function fetchCatalog(filters: CatalogFilters, limit = PAGE): Promise<Product[]> {
  let query = productsCollection().where('isActive', '==', true);
  if (filters.category) query = query.where('category', '==', filters.category);
  if (filters.brand) query = query.where('brand', '==', filters.brand);

  const sort = filters.sort ?? 'newest';
  try {
    const ordered =
      sort === 'price-asc'
        ? query.orderBy('price', 'asc')
        : sort === 'price-desc'
          ? query.orderBy('price', 'desc')
          : query.orderBy('createdAt', 'desc');
    const snap = await ordered.limit(limit).get();
    return snap.docs.map(d => ({id: d.id, ...d.data()}) as Product);
  } catch {
    const snap = await query.limit(100).get();
    const items = snap.docs.map(d => ({id: d.id, ...d.data()}) as Product);
    items.sort((a, b) =>
      sort === 'price-asc'
        ? a.price - b.price
        : sort === 'price-desc'
          ? b.price - a.price
          : b.createdAt - a.createdAt,
    );
    return items.slice(0, limit);
  }
}

/** Nom bo'yicha qidiruv - saytdagi kabi prefiks indeksi ustidan. */
export async function searchProducts(term: string, limit = 20): Promise<Product[]> {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  const snap = await productsCollection()
    .orderBy('nameSearchIndex')
    .startAt(q)
    .endAt(`${q}`)
    .limit(limit)
    .get();
  return snap.docs
    .map(d => ({id: d.id, ...d.data()}) as Product)
    .filter(p => p.isActive);
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const doc = await productsCollection().doc(id).get();
  return doc.exists ? ({id: doc.id, ...doc.data()} as Product) : null;
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const docs = await Promise.all(ids.slice(0, 30).map(id => productsCollection().doc(id).get()));
  return docs.filter(d => d.exists).map(d => ({id: d.id, ...d.data()}) as Product);
}

/** Foydalanuvchining buyurtmalari (real-vaqt). */
export function subscribeToMyOrders(uid: string, onData: (orders: Order[]) => void): () => void {
  return firestore()
    .collection('orders')
    .where('userId', '==', uid)
    .limit(50)
    .onSnapshot(
      snap => {
        const orders = snap.docs
          .map(d => ({id: d.id, ...d.data()}) as Order)
          .sort((a, b) => b.createdAt - a.createdAt);
        onData(orders);
      },
      () => onData([]),
    );
}

export function currentUser() {
  return auth().currentUser;
}

/** Saytning API'siga yuboriladigan Firebase ID token. */
export async function getIdToken(): Promise<string | null> {
  const user = auth().currentUser;
  return user ? user.getIdToken() : null;
}
