import "server-only";

/**
 * YouTube OAuth uchun umumiy qiymatlar (connect va callback bir xil
 * `redirect_uri` ishlatishi shart - Google ularni harfma-harf solishtiradi).
 *
 * CSRF `state` cookie'da EMAS, bazada saqlanadi - `oauth-state.ts` ga qarang
 * (Firebase Hosting `__session` dan boshqa cookie'ni uzatmaydi).
 */
export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.upload";

export function youtubeRedirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://atoyo-uz.web.app";
  return `${base}/api/admin/social/youtube/callback`;
}
