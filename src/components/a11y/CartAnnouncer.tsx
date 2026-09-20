"use client";

import { useEffect, useRef } from "react";
import { useAppSelector } from "@/redux/hooks";
import type { RootState } from "@/redux/store";

/**
 * SAVAT O'ZGARISHINI OVOZ BILAN E'LON QILISH.
 *
 * "Savatga qo'shish" bosilganda ekranda faqat yuqoridagi kichik son
 * o'zgaradi — ko'rmaydigan mijoz uchun hech narsa sodir bo'lmagandek
 * tuyuladi. `aria-live="polite"` mintaqasi shu o'zgarishni o'qib
 * beradi (joriy o'qishni bo'lmaydi — shuning uchun `assertive` emas).
 *
 * NEGA `useState` EMAS, DOM'ga TO'G'RIDAN-TO'G'RI YOZILADI:
 * jonli mintaqa — ekran o'quvchi kuzatadigan TASHQI tizim, aynan
 * effekt sinxronlashi kerak bo'lgan narsa. Yon foyda: har e'lon
 * uchun qayta render bo'lmaydi va mintaqa sahifada BO'SH holda,
 * o'zgarishdan OLDIN mavjud bo'ladi — brauzer faqat shundagina
 * o'zgarishni "e'lon" deb hisoblaydi.
 *
 * NOZIK JOY: savat `redux-persist` orqali localStorage'dan
 * TIKLANADI va bu mount'dan KEYIN bo'ladi. Shunchaki sonni kuzatsak,
 * har sahifa ochilishida "savatga qo'shildi" deb yolg'on e'lon
 * qilinardi. Shuning uchun `_persist.rehydrated` kutiladi.
 *
 * Savat mantiqiga (narx, son, chegara) BU KOMPONENT TEGMAYDI — u
 * faqat o'qiydi.
 */

/** `persistReducer` qo'shadigan xizmat maydoni (RootState tipida yo'q). */
type PersistedState = RootState & { _persist?: { rehydrated?: boolean } };

export function CartAnnouncer() {
  const totalCount = useAppSelector((s) =>
    s.cart.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const rehydrated = useAppSelector(
    (s) => (s as PersistedState)._persist?.rehydrated === true
  );
  const regionRef = useRef<HTMLParagraphElement>(null);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = totalCount;

    // localStorage'dan tiklanish tugamaguncha - jim.
    if (!rehydrated || before === null || before === totalCount) return;

    const node = regionRef.current;
    if (!node) return;

    if (totalCount === 0) {
      node.textContent = "Savat bo'shatildi.";
    } else if (totalCount > before) {
      node.textContent = `Savatga qo'shildi. Savatda ${totalCount} ta mahsulot.`;
    } else {
      node.textContent = `Savatdan olib tashlandi. Savatda ${totalCount} ta mahsulot.`;
    }
  }, [totalCount, rehydrated]);

  return <p ref={regionRef} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />;
}
