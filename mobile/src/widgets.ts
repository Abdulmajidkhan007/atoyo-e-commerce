import {useEffect} from 'react';
import {NativeModules, Platform} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import {useAppSelector} from './store';
import {useAuth, isStaffUser, type AppUserProfile} from './auth';
import type {CartItem, Order, OrderStatus} from './types';

/**
 * BOSH EKRAN WIDGETLARI (Android).
 *
 * Widget Kotlin'da (androidx.glance, `android/.../widget/`) va faqat
 * SharedPreferences'ni O'QIYDI - tarmoqqa o'zi chiqmaydi. Bu fayl RN
 * tomonidagi "surat" yozuvchi: ma'lumotni tayyorlaydi va nativ modul
 * (`AtoyoWidgetsModule.kt`) orqali SharedPreferences'ga JSON qilib
 * yozadi, so'ng widget qayta chizilishini so'raydi.
 *
 * Yozish paytlari (spetsifikatsiya bo'yicha): ilova ochilganda
 * (`useWidgetSync`), buyurtma yaratilganda (`CheckoutScreen`) va
 * buyurtma statusi push orqali kelganda (`push.ts`, `index.js`).
 * Savat esa qo'shimcha ravishda har o'zgarishda ham yoziladi - u
 * to'liq lokal (Redux) holat, tarmoq kerak emas.
 */

const {AtoyoWidgets} = NativeModules as {
  AtoyoWidgets?: {
    writeOrderWidget(json: string | null): void;
    writeCartWidget(json: string | null): void;
    writeStaffWidget(json: string | null): void;
  };
};

const STATUS_EMOJI: Record<OrderStatus, string> = {
  pending: '🕓',
  approved: '✅',
  delivering: '🚚',
  completed: '🎉',
  cancelled: '❌',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Kutilmoqda',
  approved: 'Qabul qilindi',
  delivering: 'Yetkazilmoqda',
  completed: 'Yakunlandi',
  cancelled: 'Bekor qilindi',
};

/** Toshkent kuni boshlanishi (UTC+5, yozgi vaqt yo'q) - saytdagi `lib/format.ts` bilan bir xil qoida. */
function tashkentStartOfDayMs(): number {
  const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
  const tashkentNow = Date.now() + TASHKENT_OFFSET_MS;
  return Math.floor(tashkentNow / 86400000) * 86400000 - TASHKENT_OFFSET_MS;
}

/** 1234567 -> "1 234 567 so'm". Widget matni har doim o'zbekcha - `i18n.tsx` dagi `group()` bilan bir xil ko'rinish. */
export function formatSom(amount: number): string {
  const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
  const grouped = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${rounded < 0 ? '-' : ''}${grouped} so'm`;
}

function call(
  method: 'writeOrderWidget' | 'writeCartWidget' | 'writeStaffWidget',
  data: object | null,
): void {
  if (Platform.OS !== 'android' || !AtoyoWidgets) return;
  try {
    AtoyoWidgets[method](data ? JSON.stringify(data) : null);
  } catch {
    // Widget yangilanmasa ham ilova ishlashda davom etadi.
  }
}

/** "Mening buyurtmam" widget'i - eng oxirgi buyurtma (yo'q bo'lsa tozalanadi). */
export function writeOrderWidget(order: Order | null): void {
  if (!order) {
    call('writeOrderWidget', null);
    return;
  }
  call('writeOrderWidget', {
    orderId: order.id,
    shortId: order.id.slice(0, 8),
    statusEmoji: STATUS_EMOJI[order.status],
    statusLabel: STATUS_LABEL[order.status],
    totalAmount: formatSom(order.totalAmount),
  });
}

/** "Savat" widget'i - bo'sh savat holati alohida chiziladi (nol yozilmaydi). */
export function writeCartWidget(items: CartItem[]): void {
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  if (count === 0) {
    call('writeCartWidget', null);
    return;
  }
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  call('writeCartWidget', {count, total: formatSom(total)});
}

/** "Xodim uchun" widget'i - rol tekshiruvi shu yerda: xodim bo'lmasa yozilmaydi. */
export function writeStaffWidget(user: AppUserProfile | null, count: number, total: number): void {
  if (!isStaffUser(user)) {
    call('writeStaffWidget', null);
    return;
  }
  call('writeStaffWidget', {count, total: formatSom(total)});
}

/** Push orqali `orderId` kelganda - hujjatni o'qib widget'ni yangilaydi. */
export async function refreshOrderWidgetFromPush(orderId?: string | null): Promise<void> {
  if (!orderId) return;
  try {
    const doc = await firestore().collection('orders').doc(orderId).get();
    if (doc.exists) writeOrderWidget({id: doc.id, ...doc.data()} as Order);
  } catch {
    // Tarmoq bo'lmasa widget eski ma'lumotni ko'rsatishda davom etadi.
  }
}

/** Ilova ochilganda: oxirgi buyurtma va (xodim bo'lsa) bugungi statistika. */
async function syncOnOpen(user: AppUserProfile | null): Promise<void> {
  if (!user) {
    call('writeOrderWidget', null);
    call('writeStaffWidget', null);
    return;
  }

  try {
    const snap = await firestore()
      .collection('orders')
      .where('userId', '==', user.uid)
      .limit(50)
      .get();
    const orders = snap.docs
      .map(d => ({id: d.id, ...d.data()}) as Order)
      .sort((a, b) => b.createdAt - a.createdAt);
    writeOrderWidget(orders[0] ?? null);
  } catch {
    // jim - keyingi ochilishda qayta urinadi.
  }

  if (!isStaffUser(user)) {
    call('writeStaffWidget', null);
    return;
  }
  try {
    const snap = await firestore()
      .collection('orders')
      .where('createdAt', '>=', tashkentStartOfDayMs())
      .get();
    const total = snap.docs.reduce((sum, d) => sum + (Number(d.data().totalAmount) || 0), 0);
    writeStaffWidget(user, snap.size, total);
  } catch {
    call('writeStaffWidget', null);
  }
}

/** Ilova ochilganda va savat o'zgarganda widget'larni yangilaydi (o'zi hech narsa chizmaydi). */
export function useWidgetSync(): void {
  const {user, loading} = useAuth();
  const items = useAppSelector(s => s.cart.items);

  useEffect(() => {
    if (Platform.OS !== 'android' || loading) return;
    syncOnOpen(user);
    // Foydalanuvchi almashganda ham (kirish/chiqish) qayta sinxronlanadi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, loading]);

  useEffect(() => {
    if (Platform.OS === 'android') writeCartWidget(items);
  }, [items]);
}
