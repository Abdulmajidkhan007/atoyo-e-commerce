"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

interface ProductGalleryProps {
  images: string[];
  alt: string;
}

/**
 * Mahsulot rasmlari galereyasi (Swiper).
 *
 * Rasm `object-contain` bilan ko'rsatiladi - ya'ni KESILMAYDI, to'liq
 * ko'rinadi (mahsulotning cheti qirqilib qolmasin). Rasm bosilsa esa
 * butun ekranni egallaydigan ko'rinish ochiladi: u yerda yana bir marta
 * bosib kattalashtirish (2.5x) va barmoq bilan surish mumkin.
 */
export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const validImages = images.filter(Boolean);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (validImages.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl2 bg-navy-50 text-navy-300 dark:bg-navy-900">
        Rasm yo&apos;q
      </div>
    );
  }

  return (
    <>
      {validImages.length === 1 ? (
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl2 bg-navy-50 dark:bg-navy-900"
          aria-label="Rasmni kattalashtirish"
        >
          <Image
            src={validImages[0]!}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain"
            priority
          />
        </button>
      ) : (
        <div className="overflow-hidden rounded-xl2">
          <Swiper
            modules={[Navigation, Pagination]}
            navigation
            pagination={{ clickable: true }}
            spaceBetween={0}
            slidesPerView={1}
            className="aspect-square w-full bg-navy-50 dark:bg-navy-900"
          >
            {validImages.map((url, index) => (
              <SwiperSlide key={url}>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="relative block aspect-square w-full cursor-zoom-in"
                  aria-label="Rasmni kattalashtirish"
                >
                  <Image
                    src={url}
                    alt={`${alt} — ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain"
                    priority={index === 0}
                  />
                </button>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={validImages}
          alt={alt}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

/**
 * TO'LIQ EKRAN ko'rinishi: qora fon, rasm butunicha ko'rinadi.
 * Bosilganda 2.5 barobar kattalashadi va sudrab (drag) ko'rish mumkin;
 * telefonda ikki barmoq bilan ham kattalashtirsa bo'ladi.
 */
function Lightbox({
  images,
  alt,
  startIndex,
  onClose,
}: {
  images: string[];
  alt: string;
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);

  const go = useCallback(
    (step: number) => {
      setZoomed(false);
      setIndex((prev) => (prev + step + images.length) % images.length);
    },
    [images.length]
  );

  // Klaviatura: Esc - yopish, o'q tugmalari - keyingi/oldingi rasm.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    // Orqadagi sahifa aylanmasin.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [go, onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition hover:bg-white/20"
        aria-label="Yopish"
      >
        ✕
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition hover:bg-white/20"
            aria-label="Oldingi rasm"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition hover:bg-white/20"
            aria-label="Keyingi rasm"
          >
            ›
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white backdrop-blur">
            {index + 1} / {images.length}
          </span>
        </>
      )}

      {/* Rasmning o'zi: bosilsa kattalashadi, fon bosilsa yopiladi. */}
      <div
        className="h-full w-full overflow-auto overscroll-contain"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="flex min-h-full min-w-full items-center justify-center p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- to'liq ekranda o'lchamni brauzer o'zi hisoblaydi */}
          <img
            src={images[index]!}
            alt={`${alt} — ${index + 1}`}
            onClick={() => setZoomed((prev) => !prev)}
            className={
              zoomed
                ? "max-w-none cursor-zoom-out select-none"
                : "max-h-[92vh] max-w-full cursor-zoom-in select-none object-contain"
            }
            style={zoomed ? { width: "250%" } : undefined}
          />
        </div>
      </div>
    </div>
  );
}
