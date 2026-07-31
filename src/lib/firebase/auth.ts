import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./client";
import type { AppUser } from "@/types/user";

const googleProvider = new GoogleAuthProvider();

/**
 * Foydalanuvchi birinchi marta kirganda Firestore `users` kolleksiyasiga
 * default { role: 'user' } bilan yozadi. Mavjud foydalanuvchi uchun
 * hech narsani o'zgartirmaydi (rolni tasodifan qayta yozib
 * yubormaslik uchun - masalan admin promote qilingan bo'lsa).
 */
async function ensureUserDocument(user: User): Promise<void> {
  const userRef = doc(getFirebaseDb(), "users", user.uid);
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

/** ID tokenni serverga yuborib, Proxy/Server Component tekshira oladigan httpOnly session cookie o'rnatadi (14 kun amal qiladi). */
async function syncSessionCookie(user: User): Promise<boolean> {
  const idToken = await user.getIdToken();
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return res.ok;
}

export async function signInWithGoogle() {
  const credential = await signInWithPopup(getFirebaseAuth(), googleProvider);
  await ensureUserDocument(credential.user);
  await syncSessionCookie(credential.user);
  return credential.user;
}

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  await syncSessionCookie(credential.user);
  return credential.user;
}

export async function registerWithEmail(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  await ensureUserDocument(credential.user);
  await syncSessionCookie(credential.user);
  return credential.user;
}

/** Parolni tiklash havolasini emailga yuboradi (login sahifasi va profil uchun). */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

/**
 * Server session cookie'sini yangilaydi. Cookie faqat kirish paytida
 * o'rnatiladi - vaqt o'tib yo'qolgan/eskirgan bo'lsa, server API'lari
 * (profil PATCH, buyurtma POST) 401 qaytarardi yoki buyurtma egasiz
 * (userId=null) saqlanardi. Muhim amaldan oldin shu funksiya chaqirilib
 * cookie qayta tiklanadi (best-effort).
 */
export async function ensureSessionCookie(): Promise<boolean> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return false;
  return syncSessionCookie(user).catch(() => false);
}

export async function signOutUser() {
  await signOut(getFirebaseAuth());
  // Server tomonidagi session cookie ham tozalanadi.
  await fetch("/api/auth/session", { method: "DELETE" });
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
