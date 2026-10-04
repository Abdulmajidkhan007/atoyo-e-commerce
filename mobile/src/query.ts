/**
 * SO'ROV QATORI (`a=1&b=2`) — `URLSearchParams` SIZ.
 *
 * React Native (Hermes) dagi `URLSearchParams` to'liq emas: `set()`
 * "URLSearchParams.set is not implemented" deb yiqiladi va katalog
 * sahifasi butunlay bo'sh qolardi. Shuning uchun ilovada so'rov
 * qatori FAQAT shu funksiya bilan yasaladi (testi
 * `src/lib/mobile/query.test.ts`). Bo'sh qiymatlar tashlanadi.
 */
export function buildQuery(params: Record<string, string | number | null | undefined>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}
