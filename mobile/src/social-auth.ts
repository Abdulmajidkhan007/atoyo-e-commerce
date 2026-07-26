import {Linking} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {exchangeTelegramCode, startTelegramLogin} from './api';
import {GOOGLE_WEB_CLIENT_ID} from './google-config';

/**
 * IJTIMOIY KIRISH - sayt bilan bir xil ikki usul:
 *   • Google (Firebase credential),
 *   • Telegram (bot orqali "deep link", `/setdomain` talab qilinmaydi).
 * Ikkalasi ham oxirida bitta Firebase hisobiga olib keladi, ya'ni
 * saytda ham, ilovada ham bir xil savat/buyurtma tarixi ko'rinadi.
 */

/** google-services.json ichidan web client ID topilmasa tugma ko'rinmaydi. */
export const googleSignInAvailable = GOOGLE_WEB_CLIENT_ID.length > 0;

let googleConfigured = false;

/** Sayt bilan bir xil `users/{uid}` hujjati (rol doim "user"). */
async function ensureUserDoc(patch: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}) {
  const ref = firestore().collection('users').doc(patch.uid);
  const snap = await ref.get();

  // Bo'sh qiymatlar yozilmaydi: Telegram oqimida nom/telefonni server
  // allaqachon to'ldirgan bo'lishi mumkin, uni null bilan bosib ketmaymiz.
  const base: Record<string, unknown> = {};
  if (patch.email) base.email = patch.email;
  if (patch.displayName) base.displayName = patch.displayName;
  if (patch.photoURL) base.photoURL = patch.photoURL;

  await ref.set(
    snap.exists
      ? base
      : {email: patch.email ?? null, ...base, role: 'user', createdAt: Date.now()},
    {merge: true},
  );
}

export async function signInWithGoogle(): Promise<void> {
  if (!googleSignInAvailable) throw new Error('google-not-configured');

  if (!googleConfigured) {
    GoogleSignin.configure({webClientId: GOOGLE_WEB_CLIENT_ID});
    googleConfigured = true;
  }

  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
  const response = await GoogleSignin.signIn();
  if (response.type !== 'success') throw new Error('cancelled');

  const idToken = response.data.idToken;
  if (!idToken) throw new Error('no-id-token');

  const credential = auth.GoogleAuthProvider.credential(idToken);
  const {user} = await auth().signInWithCredential(credential);
  await ensureUserDoc({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  });
}

export async function signOutGoogle(): Promise<void> {
  if (!googleSignInAvailable) return;
  await GoogleSignin.signOut().catch(() => {});
}

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = Math.ceil((5 * 60 * 1000) / POLL_INTERVAL_MS);

/**
 * Telegram orqali kirish: kod olinadi, bot ochiladi, so'ng kod
 * Firebase custom token'iga almashtiriladi. `onWaiting` - bot ochilgani
 * (ekranda "Start bosing" deb turish uchun).
 *
 * `isCancelled` bilan ekran yopilganda so'rov to'xtaydi.
 */
export async function signInWithTelegram(options: {
  onWaiting?: () => void;
  isCancelled?: () => boolean;
}): Promise<void> {
  const {code, url} = await startTelegramLogin();
  await Linking.openURL(url);
  options.onWaiting?.();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (options.isCancelled?.()) return;
    const result = await exchangeTelegramCode(code);

    if (result.state === 'ready') {
      const {user} = await auth().signInWithCustomToken(result.token);
      // Profil hujjatini server (`ensureTelegramUser`) allaqachon yozgan -
      // bu yerda faqat nom/rasm yangilanishi uchun yengil merge.
      await ensureUserDoc({uid: user.uid, email: user.email, displayName: user.displayName});
      return;
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('timeout');
}
