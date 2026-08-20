import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SITE_URL} from './api';
import {isNewer} from './version';

/**
 * ILOVA YANGILANISHI.
 *
 * APK Play Market orqali tarqatilmaydi - telefon ilovani O'ZI
 * yangilamaydi va foydalanuvchi yangi versiya chiqqanini bilmaydi.
 * Shuning uchun ilova ochilganda saytdan oxirgi versiyani so'raydi
 * (`/api/app/version`) va o'zinikidan yangi bo'lsa oyna ko'rsatadi.
 *
 * Tekshiruv JIMGINA: internet bo'lmasa yoki so'rov yiqilsa hech narsa
 * chiqmaydi - ilovaning ishlashiga xalaqit bermaydi.
 */

/** Shu build'ning versiyasi (android/app/build.gradle dagi versionName). */
export const APP_VERSION = '1.2';

/** Zaxira havola - server bermasa ham yuklab olish ishlasin. */
export const FALLBACK_APK_URL =
  'https://github.com/Abdulmajidkhan007/atoyo-e-commerce/releases/latest/download/app-release.apk';

/** "Keyinroq" bosilgan versiya shu kalitda saqlanadi. */
const SNOOZE_KEY = 'atoyo.update.snooze';
/** "Keyinroq" dan keyin qancha vaqt bezovta qilinmaydi. */
const SNOOZE_MS = 24 * 60 * 60 * 1000;

export {isNewer};

export interface AppUpdate {
  version: string;
  notes: string[];
  apkUrl: string;
  mandatory: boolean;
}

/** Serverdagi oxirgi versiya (yiqilsa `null`). */
export async function fetchAppUpdate(): Promise<AppUpdate | null> {
  try {
    const response = await fetch(`${SITE_URL}/api/app/version`);
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<AppUpdate>;
    if (!data.version || !isNewer(data.version, APP_VERSION)) return null;
    return {
      version: data.version,
      notes: Array.isArray(data.notes) ? data.notes.filter(Boolean) : [],
      apkUrl: data.apkUrl || FALLBACK_APK_URL,
      mandatory: data.mandatory === true,
    };
  } catch {
    return null;
  }
}

/** Shu versiya uchun "Keyinroq" bosilganmi (24 soat ichida). */
async function isSnoozed(version: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw) as {version?: string; at?: number};
    return saved.version === version && Date.now() - (saved.at ?? 0) < SNOOZE_MS;
  } catch {
    return false;
  }
}

export async function snoozeUpdate(version: string): Promise<void> {
  await AsyncStorage.setItem(SNOOZE_KEY, JSON.stringify({version, at: Date.now()})).catch(
    () => {},
  );
}

/**
 * Yangilanish holati. `update` - yangi versiya bor (oyna uchun),
 * `dismissed` - foydalanuvchi "Keyinroq" degan (banner ko'rsatiladi).
 */
export function useAppUpdate(): {
  update: AppUpdate | null;
  snoozed: boolean;
  dismiss: () => void;
} {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [snoozed, setSnoozed] = useState(false);

  useEffect(() => {
    let active = true;
    // Ilova ochilishini sekinlashtirmaslik uchun bir oz kechikib.
    const timer = setTimeout(() => {
      fetchAppUpdate()
        .then(async found => {
          if (!active || !found) return;
          const quiet = found.mandatory ? false : await isSnoozed(found.version);
          if (!active) return;
          setSnoozed(quiet);
          setUpdate(found);
        })
        .catch(() => {});
    }, 1200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  return {
    update,
    snoozed,
    dismiss: () => {
      if (update) void snoozeUpdate(update.version);
      setSnoozed(true);
    },
  };
}
