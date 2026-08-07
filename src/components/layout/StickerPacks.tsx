"use client";

import { useEffect, useState } from "react";

/**
 * DO'KON STIKERLARI (mijozga).
 *
 * Telegram to'plami havolasi - bosilsa "Add stickers" oynasi ochiladi
 * va mijoz to'plamni o'ziga qo'shadi. To'plam hali yaratilmagan
 * bo'lsa bo'lim UMUMAN ko'rinmaydi (ishlamaydigan havola bermaymiz).
 */
interface Pack {
  name: string;
  title: string;
  link: string;
}

export function StickerPacks() {
  const [packs, setPacks] = useState<Pack[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch("/api/stickers")
        .then((res) => (res.ok ? res.json() : { packs: [] }))
        .then((data: { packs?: Pack[] }) => setPacks(data.packs ?? []))
        .catch(() => setPacks([]));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (packs.length === 0) return null;

  return (
    <section className="rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
      <h2 className="mb-1 text-lg font-bold text-navy-900 dark:text-white">
        Telegram stikerlarimiz
      </h2>
      <p className="mb-3 text-sm text-navy-300">
        Bosing va o&apos;zingizga qo&apos;shing — istalgan suhbatda ishlatasiz.
      </p>
      <div className="flex flex-wrap gap-2">
        {packs.map((pack) => (
          <a
            key={pack.name}
            href={pack.link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-aqua-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-aqua-400"
          >
            🎨 {pack.title}
          </a>
        ))}
      </div>
    </section>
  );
}
