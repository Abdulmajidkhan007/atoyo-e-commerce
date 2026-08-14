/**
 * VERSIYALARNI SOLISHTIRISH (sof funksiya, importsiz).
 *
 * Yangilanish oynasi shunga tayanadi, shuning uchun alohida faylda -
 * React Native'siz test qilinadi (`version.test.ts`).
 */

/** "1.2.3" ko'rinishidagi versiyalarni raqam bo'yicha solishtiradi. */
export function isNewer(remote: string, local: string): boolean {
  const parse = (value: string) =>
    value
      .replace(/^v/i, '')
      .split('.')
      .map(part => Number.parseInt(part, 10) || 0);
  const a = parse(remote);
  const b = parse(local);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}
