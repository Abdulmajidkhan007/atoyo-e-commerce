import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./client";
import type { AppUser } from "@/types/user";

const googleProvider = new GoogleAuthProvider();

/**
 * Foydalanuvchi birinchi marta kirganda Firestore `users` kolleksiyasiga
 * default { role: 'user' } bilan yozadi. Mavjud foydalanuvchi uchun
 * hech narsani o'zgartirmaydi (rolni tasodifan qayta yozib
 * yubormaslik uchun - masalan admin promote qilingan bo'lsa).
 */
async function ensureUserDocument(user: User): Promise<void> {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const newUser: Omit<AppUser, "createdAt"> & { createdAt: unknown } = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: "user",
      createdAt: serverTimestamp(),
    };
    await setDoc(userRef, newUser);
  }
}

/** ID tokenni serverga yuborib, middleware/Server Component tekshira oladigan httpOnly cookie o'rnatadi. */
async function syncSessionCookie(user: User): Promise<void> {
  const idToken = await user.getIdToken();
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
}

export async function signInWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  await ensureUserDocument(credential.user);
  await syncSessionCookie(credential.user);
  return credential.user;
}

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await syncSessionCookie(credential.user);
  return credential.user;
}

export async function registerWithEmail(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserDocument(credential.user);
  await syncSessionCookie(credential.user);
  return credential.user;
}

export async function signOutUser() {
  await signOut(auth);
  // Server tomonidagi session cookie ham tozalanadi.
  await fetch("/api/auth/session", { method: "DELETE" });
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Firebase ID tokeni har safar avtomatik yangilanganda (odatda ~1 soatda
 * bir marta) cookie'ni ham yangilaydi, aks holda middleware/layout
 * eskirgan tokenni rad etib, foydalanuvchini navbatdagi sahifa
 * o'tishida bosh sahifaga chiqarib yuboradi.
 */
export function subscribeToIdTokenRefresh() {
  return onIdTokenChanged(auth, async (user) => {
    if (user) await syncSessionCookie(user);
  });
}
