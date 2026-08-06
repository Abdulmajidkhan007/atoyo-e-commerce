import "server-only";

/**
 * Facebook/Instagram OAuth uchun umumiy qiymatlar.
 *
 * `redirect_uri` connect va callback'da HARFMA-HARF bir xil bo'lishi
 * shart - Meta ham, Google ham shuni tekshiradi.
 */
export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",");

export const META_STATE_COOKIE = "meta_oauth_state";

export function metaRedirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://atoyo-uz.web.app";
  return `${base}/api/admin/social/meta/callback`;
}
