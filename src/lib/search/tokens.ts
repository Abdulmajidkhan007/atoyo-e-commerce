/**
 * Mahsulot nomi (va brendi) dan qidiruv tokenlari yasaydi. Prefiks-qidiruv
 * (nameSearchIndex) faqat nom BOSHIdan mos kelganda ishlaydi; tokenlar esa
 * "kran" deb qidirganda "Sharli kran 1/2" ni ham topish imkonini beradi
 * (Firestore `array-contains` so'rovi bilan).
 *
 * Client ham, server ham ishlatadi - shuning uchun "server-only" YO'Q.
 */
export function buildNameTokens(name: string, brand?: string): string[] {
  const source = `${name} ${brand ?? ""}`.toLowerCase();
  const words = source
    .split(/[^a-zA-Z0-9а-яА-ЯёЁўЎқҚғҒҳҲ'ʼ/.-]+/u)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
  return Array.from(new Set(words)).slice(0, 30);
}
