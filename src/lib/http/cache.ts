/**
 * OCHIQ JAVOBLAR UCHUN CDN KESHI.
 *
 * Sayt Firebase Hosting rewrite orqali Cloud Run'ga ulanadi va
 * backend AQShda (`us-east4`) turadi - Toshkentdan har bir so'rov
 * okean ortiga boradi. Sahifalarni keshlash mumkin emas
 * (`(main)/layout.tsx` cookie o'qiydi - locale), LEKIN shaxsiy
 * bo'lmagan GET javoblarini Hosting CDN'i keshlashi mumkin: ular
 * hammaga bir xil.
 *
 * `max-age=0` - brauzer har safar so'raydi (eski qiymat qotib
 * qolmasin), `s-maxage` - CDN shu muddat ichida serverga bormaydi,
 * `stale-while-revalidate` - muddat o'tgach ham eski javob darhol
 * beriladi va yangisi orqada olinadi (mijoz kutmaydi).
 *
 * MUHIM: bu funksiya faqat foydalanuvchiga BOG'LIQ BO'LMAGAN
 * javoblarda ishlatiladi. Rolga qarab o'zgaradigan narsalar
 * (narx, savat, profil) hech qachon `public` keshlanmaydi - CDN
 * cookie bo'yicha ajratmaydi va bir mijozning javobi boshqasiga
 * ketib qolardi.
 */
export function publicCacheHeaders(seconds: number): Record<string, string> {
  return {
    "Cache-Control": `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds * 4}`,
  };
}

/** Shaxsiy javob - keshlanmaydi (rolga bog'liq narxlar va h.k.). */
export const NO_STORE_HEADERS: Record<string, string> = { "Cache-Control": "no-store" };
