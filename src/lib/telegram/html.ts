/**
 * Telegram `parse_mode: "HTML"` uchun matnni xavfsizlashtiradi.
 * Escape qilinmasa mijoz kiritgan `<`/`>` post/xabarni buzadi
 * (yopilmagan teg — "Can't find end tag") yoki `<a href=...>` bilan
 * fishing havolasi bo'lib chiqadi.
 */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
