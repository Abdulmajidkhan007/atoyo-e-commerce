"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

interface ProductGalleryProps {
  images: string[];
  /**
   * Mahsulot videolari (Telegram kirimida yoki admin panelda
   * yuklangan). Galereyaning OXIRGI slaydlari bo'lib chiqadi -
   * mijoz rasmni ko'rgach videoni ham shu yerda ko'radi, sahifaning
   * pastiga tushishi shart emas.
   */
  videos?: string[];
  alt: string;
}

/** Galereyadagi bitta slayd: rasm yoki video. */
type Slide = { kind: "image"; url: string; imageIndex: number } | { kind: "video"; url: string };

/**
 * Mahsulot rasmlari galereyasi (Swiper).
 *
 * Rasm `object-contain` bilan ko'rsatiladi - ya'ni KESILMAYDI, to'liq
 * ko'rinadi (mahsulotning cheti qirqilib qolmasin). Rasm bosilsa esa
 * butun ekranni egallaydigan ko'rinish ochiladi: u yerda yana bir marta
 * bosib kattalashtirish (2.5x) va barmoq bilan surish mumkin.
 */
export function ProductGallery({ images, videos = [], alt }: ProductGalleryProps) {
  const validImages = images.filter(Boolean);
  const validVideos = videos.filter(Boolean);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Slaydlar: avval rasmlar, keyin videolar. Kattalashtirish (lightbox)
  // faqat RASMGA tegishli, shuning uchun rasmning o'z tartib raqami
  // slaydda alohida saqlanadi.
  const slides: Slide[] = [
    ...validImages.map((url, imageIndex) => ({ kind: "image" as const, url, imageIndex })),
    ...validVideos.map((url) => ({ kind: "video" as const, url })),
  ];

  if (slides.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl2 bg-navy-50 text-navy-300 dark:bg-navy-900">
        Rasm yo&apos;q
      </div>
    );
  }

  return (
    <>
      {slides.length === 1 ? (
        slides[0]!.kind === "video" ? (
          <VideoSlide url={slides[0]!.url} label={`${alt} — video`} rounded />
        ) : (
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl2 bg-navy-50 dark:bg-navy-900"
            aria-label={`${alt} — rasmni kattalashtirish`}
          >
            <Image
              src={slides[0]!.url}
              alt={alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-contain"
              priority
            />
          </button>
        )
      ) : (
        <div className="overflow-hidden rounded-xl2">
          <Swiper
            /*
              `A11y` MODULI SHART. Usiz Swiper'ning "oldingi/keyingi"
              strelkalari va nuqtalari oddiy <div> bo'lib qoladi:
              klaviatura bilan ularga tushib bo'lmaydi va ekran
              o'quvchi ularni umuman ko'rmaydi. Modul ularga
              `role="button"`, `tabindex` va quyidagi NOMLARNI qo'yadi
              (standart matni inglizcha, shuning uchun o'zimiz beramiz).
            */
            modules={[A11y, Navigation, Pagination]}
            navigation
            a11y={{
              enabled: true,
              containerMessage: `${alt} — rasmlar galereyasi`,
              prevSlideMessage: "Oldingi rasm",
              nextSlideMessage: "Keyingi rasm",
              firstSlideMessage: "Bu birinchi rasm",
              lastSlideMessage: "Bu oxirgi rasm",
              paginationBulletMessage: "{{index}}-rasmga o'tish",
              slideRole: "group",
            }}
            pagination={{ clickable: true }}
            spaceBetween={0}
            slidesPerView={1}
            className="aspect-square w-full bg-navy-50 dark:bg-navy-900"
          >
            {slides.map((slide, index) =>
              slide.kind === "video" ? (
                <SwiperSlide key={slide.url}>
                  <VideoSlide url={slide.url} label={`${alt} — video`} />
                </SwiperSlide>
              ) : (
                <SwiperSlide key={slide.url}>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(slide.imageIndex)}
                    className="relative block aspect-square w-full cursor-zoom-in"
                    aria-label={`${alt} — ${slide.imageIndex + 1}-rasmni kattalashtirish`}
                  >
                    <Image
                      src={slide.url}
                      alt={`${alt} — ${slide.imageIndex + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-contain"
                      priority={index === 0}
                    />
                  </button>
                </SwiperSlide>
              )
            )}
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
 * VIDEO SLAYDI.
 *
 * `preload="metadata"` - butun fayl emas, faqat birinchi kadr va
 * davomiyligi yuklanadi (mobil internetni tejaydi). Avtomatik
 * o'ynatilmaydi: mijoz o'zi bosadi.
 */
function VideoSlide({
  url,
  label,
  rounded = false,
}: {
  url: string;
  /** Ekran o'quvchi uchun nom - usiz shunchaki "video" deb o'qiladi. */
  label: string;
  rounded?: boolean;
}) {
  return (
    <div
      className={`flex aspect-square w-full items-center justify-center bg-black ${
        rounded ? "overflow-hidden rounded-xl2" : ""
      }`}
    >
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        aria-label={label}
        className="max-h-full max-w-full"
      />
    </div>
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
  const panelRef = useRef<HTMLDivElement>(null);
  /** Oyna ochilishidan oldin fokus turgan element - yopilgach qaytariladi. */
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const go = useCallback(
    (step: number) => {
      setZoomed(false);
      setIndex((prev) => (prev + step + images.length) % images.length);
    },
    [images.length]
  );

  /**
   * KLAVIATURA VA FOKUS.
   *
   * Esc - yopish, o'q tugmalari - keyingi/oldingi rasm.
   *
   * FOKUS QOPQONI (focus trap): oyna ochilgach fokus uning ICHIGA
   * ko'chadi va Tab bilan undan chiqib ketib bo'lmaydi. Busiz ekran
   * o'quvchi foydalanuvchisi "ochiq" oynaning orqasidagi sahifani
   * o'qib ketardi va qayerdaligini yo'qotardi. Yopilganda fokus
   * qaytib o'zi bosgan tugmaga boradi.
   */
  useEffect(() => {
    returnFocusTo.current = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((node) => !node.hasAttribute("disabled"));

    // Birinchi fokus - oynaning o'zida (yopish tugmasida).
    focusable()[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
      if (event.key !== "Tab") return;

      const nodes = focusable();
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement;
      // Chekkaga yetganda aylanib, boshiga/oxiriga qaytadi.
      if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    // Orqadagi sahifa aylanmasin.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      returnFocusTo.current?.focus?.();
    };
  }, [go, onClose]);

  return (
    <div
      ref={panelRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — kattalashtirilgan rasm`}
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
          <span
            /* Rasm almashganda ekran o'quvchi "3 / 8" deb aytib bersin. */
            role="status"
            aria-live="polite"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white backdrop-blur"
          >
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
