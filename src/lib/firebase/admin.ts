import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

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

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentiallari topilmadi. .env faylida FIREBASE_ADMIN_* o'zgaruvchilarini tekshiring."
    );
  }

  cachedApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return cachedApp;
}

let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

export function getAdminAuth(): Auth {
  return (cachedAuth ??= getAuth(getAdminApp()));
}

export function getAdminDb(): Firestore {
  return (cachedDb ??= getFirestore(getAdminApp()));
}
