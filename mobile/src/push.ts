import {useEffect} from 'react';
import {PermissionsAndroid, Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {useNavigation} from '@react-navigation/native';
import {savePushToken, deletePushToken} from './api';
import {useAuth} from './auth';
import {useToast} from './components/Toast';

/**
 * PUSH BILDIRISHNOMALAR.
 *
 * • Buyurtma holati o'zgarganda (qabul qilindi / yetkazilmoqda /
 *   yakunlandi / bekor) - shaxsan o'sha mijozga. Buning uchun qurilma
 *   tokeni saytga yuboriladi va `users/{uid}.pushTokens` da saqlanadi.
 * • Yangi mahsulot va chegirmalar - hammaga, `products` mavzusi orqali
 *   (kirmagan foydalanuvchi ham oladi).
 *
 * Ilova ochiq turganda Android bildirishnoma ko'rsatmaydi - shuning
 * uchun bunday xabar toast bo'lib chiqadi (saytdagi kabi).
 */

const PRODUCTS_TOPIC = 'products';
/**
 * ILOVA YANGILANISHI mavzusi. Alohida: mahsulot e'lonlari kerak
 * bo'lmasa ham, yangi APK chiqqanini bilish kerak - Play Market
 * yo'q, ilova o'zi yangilanmaydi.
 */
const APP_TOPIC = 'app-updates';

export interface PushStatus {
  /** Bildirishnomaga ruxsat berilganmi. */
  allowed: boolean;
  /** Qurilma tokeni olindimi (FCM sozlanganmi). */
  hasToken: boolean;
  /** Token serverga yozildimi (kirmagan foydalanuvchida - false). */
  saved: boolean;
  /** Nima noto'g'ri ketgani (bo'lsa). */
  error?: string;
}

/**
 * Bildirishnoma zanjirini QAYTA ishga tushiradi va natijani qaytaradi:
 * ruxsat -> token -> serverga yozish. Sozlamalar ekranidagi tugma shuni
 * chaqiradi, shunda "kelmayapti" degan holatning sababi ko'rinadi.
 */
export async function refreshPushRegistration(signedIn: boolean): Promise<PushStatus> {
  const allowed = await ensurePermission();
  if (!allowed) return {allowed: false, hasToken: false, saved: false};

  await messaging().subscribeToTopic(PRODUCTS_TOPIC).catch(() => {});
  await messaging().subscribeToTopic(APP_TOPIC).catch(() => {});

  let token: string | null = null;
  try {
    token = await messaging().getToken();
  } catch (error) {
    return {
      allowed: true,
      hasToken: false,
      saved: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  if (!token) return {allowed: true, hasToken: false, saved: false};
  if (!signedIn) return {allowed: true, hasToken: true, saved: false};

  try {
    await savePushToken(token);
    return {allowed: true, hasToken: true, saved: true};
  } catch (error) {
    return {
      allowed: true,
      hasToken: true,
      saved: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Android 13+ da bildirishnoma uchun alohida ruxsat so'raladi. */
async function ensurePermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
    }
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

/**
 * Ilova ishga tushganda bir marta chaqiriladi: ruxsat, token va
 * xabarlarni tinglash. Kirmagan foydalanuvchida ham umumiy mavzu
 * ishlaydi, token esa faqat kirgandan keyin yuboriladi.
 */
export function usePushNotifications(): void {
  const {user} = useAuth();
  const toast = useToast();
  const navigation = useNavigation();

  useEffect(() => {
    let active = true;
    let currentToken: string | null = null;

    /** Bildirishnoma bosilganda kerakli ekranni ochamiz. */
    const open = (data?: {[key: string]: string | object | number}) => {
      const screen = typeof data?.screen === 'string' ? data.screen : null;
      const productId = typeof data?.productId === 'string' ? data.productId : null;
      const go = navigation as unknown as {navigate: (name: string, params?: object) => void};
      // "update" - yangilanish bildirishnomasi: alohida ekran yo'q,
      // ilova ochilganda yangilanish oynasi o'zi chiqadi.
      if (screen === 'update') return;
      if (screen === 'Mahsulot' && productId) go.navigate('Mahsulot', {productId});
      else if (screen) go.navigate(screen);
    };

    const setup = async () => {
      if (!(await ensurePermission())) return;

      // Umumiy e'lonlar - hamma qurilmaga.
      await messaging().subscribeToTopic(PRODUCTS_TOPIC).catch(() => {});
      await messaging().subscribeToTopic(APP_TOPIC).catch(() => {});

      const token = await messaging().getToken().catch(() => null);
      if (!active || !token) return;
      currentToken = token;
      // Token faqat kirgan foydalanuvchi uchun saqlanadi (kimga
      // yuborishni bilish uchun hisob kerak).
      if (user) await savePushToken(token).catch(() => {});
    };

    setup();

    // Token yangilanishi mumkin (ilova qayta o'rnatilganda va h.k.).
    const unsubscribeRefresh = messaging().onTokenRefresh(async token => {
      currentToken = token;
      if (user) await savePushToken(token).catch(() => {});
    });

    // Ilova OCHIQ turganda kelgan xabar - toast bo'lib chiqadi.
    const unsubscribeMessage = messaging().onMessage(async message => {
      const title = message.notification?.title ?? '';
      const body = message.notification?.body ?? '';
      if (title || body) toast.info([title, body].filter(Boolean).join(' — '));
    });

    // Fon rejimidagi bildirishnoma bosilgani.
    const unsubscribeOpened = messaging().onNotificationOpenedApp(message => {
      open(message.data);
    });

    // Ilova butunlay yopiq bo'lganda bosilgan bildirishnoma.
    messaging()
      .getInitialNotification()
      .then(message => {
        if (message) open(message.data);
      })
      .catch(() => {});

    return () => {
      active = false;
      unsubscribeRefresh();
      unsubscribeMessage();
      unsubscribeOpened();
      // Chiqishda token serverdan o'chiriladi - boshqa odamga
      // bildirishnoma bormasligi uchun.
      if (currentToken && user) deletePushToken(currentToken).catch(() => {});
    };
  }, [user, toast, navigation]);
}
