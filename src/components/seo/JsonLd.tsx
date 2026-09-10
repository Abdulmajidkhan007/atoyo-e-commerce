/**
 * JSON-LD blokini sahifaga qo'yadi (server komponent - client JS
 * kutilmaydi). Google va boshqa qidiruv tizimlari shu ma'lumot orqali
 * narx, mavjudlik va reytingni ko'rsatadi.
 *
 * NONCE ATAYLAB QO'YILMAGAN. `type="application/ld+json"` — MA'LUMOT
 * bloki, brauzer uni BAJARMAYDI, shuning uchun CSP `script-src` unga
 * tegmaydi. Bu komponent client komponentlardan ham chaqiriladi, ya'ni
 * `next/headers` ni o'qiy olmaydi (build "You're importing a module
 * that depends on next/headers" deb yiqiladi). Sinab ko'rilgan va
 * qaytarilgan.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Ma'lumot o'z serverimizda yasaladi - foydalanuvchi kiritmaydi.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
