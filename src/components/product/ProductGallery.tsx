"use client";

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
 * Mahsulot rasmlari galereyasi (Swiper). Bitta rasm bo'lsa oddiy rasm,
 * bir nechta bo'lsa surib ko'riladigan (swipe) karusel: mobil'da barmoq
 * bilan surish, desktopda o'q tugmalar va nuqtalar.
 */
export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const validImages = images.filter(Boolean);

  if (validImages.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl2 bg-navy-50 text-navy-300 dark:bg-navy-900">
        Rasm yo&apos;q
      </div>
    );
  }

  if (validImages.length === 1) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-xl2 bg-navy-50 dark:bg-navy-900">
        <Image src={validImages[0]!} alt={alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
      </div>
    );
  }

  return (
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
            <div className="relative aspect-square w-full">
              <Image
                src={url}
                alt={`${alt} — ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority={index === 0}
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
