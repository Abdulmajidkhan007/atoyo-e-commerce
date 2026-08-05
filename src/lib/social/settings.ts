import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_SOCIAL_SETTINGS, type SocialSettings } from "@/types/social";

/**
 * IJTIMOIY TARMOQ SOZLAMALARI (`settings/social`): qaysi tarmoq
 * yoqilgan, post matni shabloni va kunlik chegara. 60 soniya keshlanadi.
 */
const DOC_PATH = "settings/social";
const TTL = 60 * 1000;

let cache: { value: SocialSettings; at: number } | null = null;

export async function getSocialSettings(): Promise<SocialSettings> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;

  try {
    const snap = await getAdminDb().doc(DOC_PATH).get();
    const data = (snap.data() ?? {}) as Partial<SocialSettings>;
    const value: SocialSettings = {
      instagram: data.instagram === true,
      facebook: data.facebook === true,
      youtube: data.youtube === true,
      template:
        typeof data.template === "string" && data.template.trim()
          ? data.template
          : DEFAULT_SOCIAL_SETTINGS.template,
      dailyLimit:
        typeof data.dailyLimit === "number" && data.dailyLimit >= 0
          ? Math.min(data.dailyLimit, 50)
          : DEFAULT_SOCIAL_SETTINGS.dailyLimit,
      hashtags:
        typeof data.hashtags === "string" ? data.hashtags : DEFAULT_SOCIAL_SETTINGS.hashtags,
    };
    cache = { value, at: Date.now() };
    return value;
  } catch {
    return DEFAULT_SOCIAL_SETTINGS;
  }
}

export async function saveSocialSettings(patch: Partial<SocialSettings>): Promise<SocialSettings> {
  await getAdminDb().doc(DOC_PATH).set({ ...patch, updatedAt: Date.now() }, { merge: true });
  cache = null;
  return getSocialSettings();
}
