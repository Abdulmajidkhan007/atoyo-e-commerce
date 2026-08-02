import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import type {BlogPost, Order, Product, ProductCategory} from './types';
import {matchesAllWords, searchTermVariants} from './search';

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
  /** Material slug'i (metadata/taxonomy dagi kabi). */
  material?: string;
  /** Ishlab chiqarilgan davlat. */
  country?: string;
  /** Narx oralig'i (so'mda) - xotirada filtrlanadi, indeks talab qilmaydi. */
  minPrice?: number;
  maxPrice?: number;
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
  if (filters.material) query = query.where('material', '==', filters.material);
  if (filters.country) query = query.where('manufacturerCountry', '==', filters.country);

  const sort = filters.sort ?? 'newest';
  try {
    const ordered =
      sort === 'price-asc'
        ? query.orderBy('price', 'asc')
        : sort === 'price-desc'
          ? query.orderBy('price', 'desc')
          : query.orderBy('createdAt', 'desc');
    const snap = await ordered.limit(limit).get();
    return byPrice(
      snap.docs.map(d => ({id: d.id, ...d.data()}) as Product),
      filters,
    );
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
    return byPrice(items, filters).slice(0, limit);
  }
}

/**
 * Narx oralig'i xotirada filtrlanadi: Firestore'da diapazon so'rovi
 * boshqa maydon bo'yicha saralash bilan birga kompozit indeks talab
 * qiladi, ro'yxat esa baribir cheklangan (bir sahifa).
 */
function byPrice(items: Product[], filters: CatalogFilters): Product[] {
  const min = filters.minPrice ?? 0;
  const max = filters.maxPrice ?? Number.POSITIVE_INFINITY;
  if (min <= 0 && max === Number.POSITIVE_INFINITY) return items;
  return items.filter(item => {
    const price = item.discountPrice && item.discountPrice > 0 ? item.discountPrice : item.price;
    return price >= min && price <= max;
  });
}

/** Nom bo'yicha qidiruv - saytdagi kabi prefiks indeksi ustidan. */
export async function searchProducts(term: string, limit = 20): Promise<Product[]> {
  const q = term.trim().toLowerCase();
  if (!q) return [];

  // Ikki so'rov parallel (saytdagi kabi):
  //   • nom BOSHIdan mos kelishi (nameSearchIndex),
  //   • nomning istalgan so'zi (nameTokens) - "8276 dush" ham,
  //     "dush 8276" ham topiladi; kirillcha yozilsa ham topiladi.
  const [prefix, tokens] = await Promise.all([
    productsCollection()
      .orderBy('nameSearchIndex')
      .startAt(q)
      .endAt(`${q}`)
      .limit(limit)
      .get()
      .catch(() => null),
    productsCollection()
      .where('nameTokens', 'array-contains-any', searchTermVariants(q))
      .limit(limit)
      .get()
      .catch(() => null),
  ]);

  const seen = new Set<string>();
  const results: Product[] = [];
  for (const doc of [...(prefix?.docs ?? []), ...(tokens?.docs ?? [])]) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    const product = {id: doc.id, ...doc.data()} as Product;
    if (!product.isActive) continue;
    results.push(product);
  }

  // So'zlarning HAMMASI mos kelganlari oldinda tursin.
  const strong = results.filter(p =>
    matchesAllWords([p.name, p.brand, p.code].filter(Boolean).join(' '), q),
  );
  return (strong.length > 0 ? strong : results).slice(0, limit);
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const doc = await productsCollection().doc(id).get();
  return doc.exists ? ({id: doc.id, ...doc.data()} as Product) : null;
}

/**
 * O'XSHASH MAHSULOTLAR - saytdagi kabi shu kategoriyadan (eng ko'p
 * sotilgani oldinda), o'zi ro'yxatdan chiqarib tashlanadi.
 */
export async function fetchRelatedProducts(product: Product, limit = 8): Promise<Product[]> {
  const base = productsCollection()
    .where('isActive', '==', true)
    .where('category', '==', product.category);
  try {
    const snap = await base.orderBy('salesCount', 'desc').limit(limit + 1).get();
    return snap.docs
      .map(d => ({id: d.id, ...d.data()}) as Product)
      .filter(item => item.id !== product.id)
      .slice(0, limit);
  } catch {
    const snap = await base.limit(limit + 1).get();
    return snap.docs
      .map(d => ({id: d.id, ...d.data()}) as Product)
      .filter(item => item.id !== product.id)
      .slice(0, limit);
  }
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

/**
 * Blog maqolalari. Indeks bo'lmasa saralashsiz o'qib, xotirada
 * tartiblaymiz (katalogdagi bilan bir xil ehtiyot chorasi).
 */
export async function fetchBlogPosts(limit = 20): Promise<BlogPost[]> {
  const base = firestore().collection('blogPosts').where('isPublished', '==', true);
  const toPosts = (docs: {id: string; data: () => unknown}[]) =>
    docs.map(d => ({id: d.id, ...(d.data() as object)}) as BlogPost);

  try {
    const snap = await base.orderBy('createdAt', 'desc').limit(limit).get();
    return toPosts(snap.docs);
  } catch {
    const snap = await base.limit(50).get();
    return toPosts(snap.docs)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}

export async function fetchBlogPost(id: string): Promise<BlogPost | null> {
  const doc = await firestore().collection('blogPosts').doc(id).get();
  return doc.exists ? ({id: doc.id, ...doc.data()} as BlogPost) : null;
}

export function currentUser() {
  return auth().currentUser;
}

/** Saytning API'siga yuboriladigan Firebase ID token. */
export async function getIdToken(): Promise<string | null> {
  const user = auth().currentUser;
  return user ? user.getIdToken() : null;
}
