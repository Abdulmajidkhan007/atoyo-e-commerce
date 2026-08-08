"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initsializatsiya ATAYLAB "lazy" (birinchi haqiqiy chaqiruvda amalga
// oshadi). "use client" bo'lsa ham, Next.js "use client" sahifalarni
// build vaqtida server tomonida (SSR/statik eksport) ham render qiladi -
// agar bu yerda getAuth()/getFirestore() modul yuklanishi bilanoq
// chaqirilsa, .env sozlanmagan har qanday build (masalan CI) yoki hatto
// Firebase loyihasi hali ulanmagan mahalliy muhitda ham
// "auth/invalid-api-key" xatosi bilan BUTUN build'ni to'xtatib qo'yadi.
// Lazy pattern esa xatoni faqat funksiya haqiqatan brauzerda
// chaqirilganda (masalan foydalanuvchi "Kirish" tugmasini bosganda)
// ko'rsatadi.

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

function getFirebaseApp(): FirebaseApp {
  return (cachedApp ??= getApps().length ? getApp() : initializeApp(firebaseConfig));
}

export function getFirebaseAuth(): Auth {
  return (cachedAuth ??= getAuth(getFirebaseApp()));
}

export function getFirebaseDb(): Firestore {
  return (cachedDb ??= getFirestore(getFirebaseApp()));
}

// ESLATMA: bu yerda `getFirebaseStorage()` yo'q. Rasmlar client'dan
// EMAS, server API route'lari orqali (Admin SDK + `sharp`) yuklanadi -
// `lib/firebase/admin-storage.ts` ga qarang.
