import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { SocialSecretsStatus } from "@/types/social";

/**
 * IJTIMOIY TARMOQ KALITLARI (server-only).
 *
 * Telegram kalitlari kabi: `secrets/social` hujjatida saqlanadi
 * (Firestore qoidalarida `secrets/**` hammaga yopiq), env'dan ustun
 * turadi va 60 soniya keshlanadi. Admin panel orqali yangilanadi -
 * har safar deploy qilish shart emas.
 */

const DOC_PATH = "secrets/social";
const CACHE_TTL_MS = 60 * 1000;

export interface SocialSecrets {
  /** Meta (Facebook) dasturi - "ulanish" tugmasi shu bilan ishlaydi. */
  metaAppId: string;
  metaAppSecret: string;
  /** Facebook sahifasining uzoq muddatli tokeni. */
  pageAccessToken: string;
  /** Facebook sahifa ID si. */
  pageId: string;
  /** Instagram Business akkaunt ID si (IG User ID). */
  igUserId: string;
  /** YouTube (Google Cloud) OAuth mijozi. */
  youtubeClientId: string;
  youtubeClientSecret: string;
  /** Kanal egasidan olingan refresh token. */
  youtubeRefreshToken: string;
}

const EMPTY: SocialSecrets = {
  metaAppId: "",
  metaAppSecret: "",
  pageAccessToken: "",
  pageId: "",
  igUserId: "",
  youtubeClientId: "",
  youtubeClientSecret: "",
  youtubeRefreshToken: "",
};

let cache: { value: SocialSecrets; at: number } | null = null;

function fromEnv(): SocialSecrets {
  return {
    metaAppId: process.env.META_APP_ID ?? "",
    metaAppSecret: process.env.META_APP_SECRET ?? "",
    pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN ?? "",
    pageId: process.env.FB_PAGE_ID ?? "",
    igUserId: process.env.IG_USER_ID ?? "",
    youtubeClientId: process.env.YOUTUBE_CLIENT_ID ?? "",
    youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
    youtubeRefreshToken: process.env.YOUTUBE_REFRESH_TOKEN ?? "",
  };
}

export async function getSocialSecrets(): Promise<SocialSecrets> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;

  const env = fromEnv();
  try {
    const snap = await getAdminDb().doc(DOC_PATH).get();
    const stored = (snap.data() ?? {}) as Partial<SocialSecrets>;
    const value: SocialSecrets = {
      ...EMPTY,
      ...env,
      // Firestore'dagi qiymat env'dan ustun (bo'sh bo'lsa - env qoladi).
      ...Object.fromEntries(
        Object.entries(stored).filter(([, item]) => typeof item === "string" && item.trim())
      ),
    };
    cache = { value, at: Date.now() };
    return value;
  } catch {
    return env;
  }
}

/** Kalitlarni yangilash (admin panel). */
export async function saveSocialSecrets(patch: Partial<SocialSecrets>): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(patch)
      .filter(([, value]) => typeof value === "string")
      .map(([key, value]) => [key, (value as string).trim()])
  );
  await getAdminDb().doc(DOC_PATH).set({ ...clean, updatedAt: Date.now() }, { merge: true });
  cache = null;
}

/** Qaysi tarmoq sozlangani (kalitlarning O'ZI ko'rsatilmaydi). */
export async function describeSocialSecrets(): Promise<SocialSecretsStatus> {
  const secrets = await getSocialSecrets();
  return {
    metaApp: Boolean(secrets.metaAppId && secrets.metaAppSecret),
    facebookPage: Boolean(secrets.pageAccessToken && secrets.pageId),
    instagram: Boolean(secrets.pageAccessToken && secrets.igUserId),
    youtube: Boolean(
      secrets.youtubeClientId && secrets.youtubeClientSecret && secrets.youtubeRefreshToken
    ),
  };
}
