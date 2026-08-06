import "server-only";

/**
 * YouTube OAuth uchun umumiy qiymatlar (connect va callback bir xil
 * `redirect_uri` ishlatishi shart - Google ularni harfma-harf solishtiradi).
 */
export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.upload";
export const YOUTUBE_STATE_COOKIE = "yt_oauth_state";

export function youtubeRedirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://atoyo-uz.web.app";
  return `${base}/api/admin/social/youtube/callback`;
}
