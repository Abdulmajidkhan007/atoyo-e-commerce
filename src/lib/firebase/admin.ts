import "server-only";
import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

// DIQQAT: Bu fayl faqat server tomonida ishlaydi (API Routes, Server
// Actions, Server Components, middleware emas - middleware Edge runtime
// ishlatadi va Admin SDK'ni qo'llamaydi). "server-only" importi bu
// modulni Client Component bundle'ga qo'shishga urinilsa build-time
// xatolik chiqaradi - maxfiy kalitlarning brauzerga sizib chiqishidan
// himoya qiladi.
//
// Initsializatsiya ATAYLAB "lazy" (birinchi haqiqiy chaqiruvda amalga
// oshadi), chunki Next.js build jarayoni route fayllarini import qilib,
// sahifa ma'lumotlarini yig'ib chiqadi - agar bu yerda modul yuklanishi
// bilanoq initializeApp() chaqirilsa, .env sozlanmagan har qanday build
// (masalan CI'da typecheck) muvaffaqiyatsiz tugaydi.

let cachedApp: App | null = null;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApps()[0]!;
    return cachedApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // 1) Xizmat akkaunti kaliti env'da bo'lsa - o'shani ishlatamiz
  //    (Netlify, lokal ishlab chiqish, boshqa hostinglar).
  if (projectId && clientEmail && privateKey) {
    cachedApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return cachedApp;
  }

  // 2) Google Cloud ichida (Firebase App Hosting / Cloud Run / Cloud
  //    Functions) kalit umuman kerak emas: xizmat akkaunti muhitning
  //    o'zida bo'ladi (Application Default Credentials). Shu sabab
  //    maxfiy kalitni env'ga qo'yish shart emas.
  const adcProjectId =
    projectId ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.K_SERVICE) {
    cachedApp = initializeApp({ credential: applicationDefault(), projectId: adcProjectId });
    return cachedApp;
  }

  throw new Error(
    "Firebase Admin credentiallari topilmadi. FIREBASE_ADMIN_* o'zgaruvchilarini tekshiring " +
      "(Google Cloud ichida ishlayotgan bo'lsa ular shart emas)."
  );
}

let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let cachedStorage: Storage | null = null;

export function getAdminAuth(): Auth {
  return (cachedAuth ??= getAuth(getAdminApp()));
}

export function getAdminDb(): Firestore {
  return (cachedDb ??= getFirestore(getAdminApp()));
}

export function getAdminStorage(): Storage {
  return (cachedStorage ??= getStorage(getAdminApp()));
}
