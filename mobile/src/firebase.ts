import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import type {BlogPost, Order} from './types';

/**
 * Firebase - @react-native-firebase orqali. Sozlash fayllari:
 *   android/app/google-services.json  va  ios/GoogleService-Info.plist
 * (Firebase konsolidan yuklab olinadi - README'da tartib bor).
 *
 * Bu fayl faqat KIRISH (auth), BUYURTMA va BLOG bilan ishlaydi.
 *
 * Katalog bu yerda EMAS: mahsulot hujjatida optom narx va tannarx
 * turgani uchun `products` kolleksiyasi Firestore qoidalarida yopilgan.
 * Katalog/qidiruv saytning API'si orqali o'qiladi - `api.ts` dagi
 * `fetchCatalog`, `searchProducts`, `fetchProductWithRelated`.
 */

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
