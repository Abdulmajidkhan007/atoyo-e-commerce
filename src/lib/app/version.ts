import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * ILOVA VERSIYASI (Android APK).
 *
 * Ilova Play Market orqali tarqatilmaydi - APK to'g'ridan-to'g'ri
 * yuklab olinadi, ya'ni telefon uni O'ZI yangilamaydi. Shuning uchun:
 *
 *   • ilova ochilganda `/api/app/version` dan oxirgi versiyani so'raydi;
 *   • o'zinikidan yangi bo'lsa - "nima o'zgardi" ro'yxati bilan oyna
 *     chiqadi va bir bosishda APK yuklanadi;
 *   • admin esa yangilanish haqida PUSH yuborishi mumkin (obunachilar
 *     ilovani ochmasa ham biladi).
 *
 * Ma'lumot `settings/appUpdate` hujjatida - uni admin panelidan
 * to'ldiriladi (GitHub'dagi reliz bilan qo'lda moslanadi, shunda
 * GitHub API'ning so'rov chegarasiga bog'liq bo'lib qolmaymiz).
 */

const DOC_PATH = "settings/appUpdate";

/** Reliz doim shu manzilda turadi (CI `latest` tegini ko'chirib boradi). */
export const DEFAULT_APK_URL =
  "https://github.com/Abdulmajidkhan007/atoyo-e-commerce/releases/latest/download/app-release.apk";

export interface AppUpdateInfo {
  /** "1.1" ko'rinishida (ilovadagi `APP_VERSION` bilan solishtiriladi). */
  version: string;
  /** Qisqa "nima o'zgardi" - har qatori alohida band. */
  notes: string[];
  /** APK havolasi. */
  apkUrl: string;
  /** Majburiy yangilanish (oynani yopib bo'lmaydi). */
  mandatory: boolean;
  updatedAt: number;
}

const EMPTY: AppUpdateInfo = {
  version: "",
  notes: [],
  apkUrl: DEFAULT_APK_URL,
  mandatory: false,
  updatedAt: 0,
};

export async function getAppUpdate(): Promise<AppUpdateInfo> {
  try {
    const snap = await getAdminDb().doc(DOC_PATH).get();
    const data = snap.data();
    if (!data) return EMPTY;
    return {
      version: typeof data.version === "string" ? data.version.trim() : "",
      notes: Array.isArray(data.notes) ? (data.notes as string[]).filter(Boolean).slice(0, 10) : [],
      apkUrl: typeof data.apkUrl === "string" && data.apkUrl ? data.apkUrl : DEFAULT_APK_URL,
      mandatory: data.mandatory === true,
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
    };
  } catch {
    return EMPTY;
  }
}

export async function saveAppUpdate(
  input: Pick<AppUpdateInfo, "version" | "notes" | "apkUrl" | "mandatory">
): Promise<AppUpdateInfo> {
  const next: AppUpdateInfo = {
    version: input.version.trim(),
    notes: input.notes.map((note) => note.trim()).filter(Boolean).slice(0, 10),
    apkUrl: input.apkUrl.trim() || DEFAULT_APK_URL,
    mandatory: input.mandatory,
    updatedAt: Date.now(),
  };
  await getAdminDb().doc(DOC_PATH).set(next, { merge: true });
  return next;
}
