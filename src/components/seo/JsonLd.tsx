/**
 * JSON-LD blokini sahifaga qo'yadi (server komponent - client JS
 * kutilmaydi). Google va boshqa qidiruv tizimlari shu ma'lumot orqali
 * narx, mavjudlik va reytingni ko'rsatadi.
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
