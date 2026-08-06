import "server-only";

/**
 * Facebook/Instagram OAuth uchun umumiy qiymatlar.
 *
 * `redirect_uri` connect va callback'da HARFMA-HARF bir xil bo'lishi
 * shart - Meta ham, Google ham shuni tekshiradi.
 *
 * CSRF `state` cookie'da EMAS, bazada saqlanadi - `oauth-state.ts` ga qarang.
 */
export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",");


export function metaRedirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://atoyo-uz.web.app";
  return `${base}/api/admin/social/meta/callback`;
}
