"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * SEGMENT TANLAGICH — surib tanlanadigan "yostiq".
 *
 * Ilgari tanlangan variantning orqasidagi rang shunchaki bir tugmadan
 * ikkinchisiga SAKRAB o'tardi. Endi u Telegramning pastki panelidagi
 * kabi SURILIB boradi va tanlagichning o'zini ushlab chapga-o'ngga
 * sudrab ham tanlash mumkin (barmoq bilan ham, sichqoncha bilan ham).
 *
 * Ishlash tartibi:
 *   • "yostiq" — absolute joylashgan div, tanlangan tugmaning
 *     `offsetLeft`/`offsetWidth` iga ko'chiriladi (CSS transition);
 *   • sudralayotganda transition o'chadi va yostiq barmoq bilan
 *     birga yuradi; qo'yib yuborilganda eng yaqin variant tanlanadi;
 *   • klaviaturada ← → tugmalari ham ishlaydi (qulaylik).
 */

export interface SegmentOption {
  value: string;
  label: string;
  /** Mavjud emas (zaxirasi yo'q) - xiralashadi, lekin tanlansa bo'ladi. */
  dimmed?: boolean;
}

export function SegmentedPicker({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState<{ left: number; top: number; width: number; height: number } | null>(
    null
  );
  /** Sudralayotganda yostiqning qo'shimcha siljishi (px). */
  const [dragDx, setDragDx] = useState(0);
  /** Sudrash holati render paytida ham kerak (transition o'chishi uchun). */
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef<{ startX: number; baseLeft: number } | null>(null);
  /** Haqiqatan surildimi (shunchaki bosish bo'lsa tugma o'zi ishlaydi). */
  const moved = useRef(false);
  /** Sudralayotganda yostiq qaysi variant ustida turibdi (oq matn uchun). */
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const index = Math.max(0, options.findIndex((option) => option.value === value));

  /** Yostiqni tanlangan tugmaning ustiga qo'yish. */
  const measure = useCallback(() => {
    const button = buttonsRef.current[index];
    if (!button) return;
    setPill({
      left: button.offsetLeft,
      top: button.offsetTop,
      width: button.offsetWidth,
      height: button.offsetHeight,
    });
  }, [index]);

  // Render bo'lgach o'lchaymiz (shrift yuklangach kenglik o'zgaradi).
  useLayoutEffect(measure, [measure, options.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  /**
   * Yostiq markaziga eng yaqin variant. Turlar bir necha QATORGA
   * bo'linishi mumkin, shuning uchun masofa ikki o'lchamda o'lchanadi
   * (aks holda pastdagi qator ustidagiga aralashib ketardi).
   */
  const nearest = (centerX: number, centerY: number) => {
    let best = index;
    let bestDistance = Infinity;
    buttonsRef.current.forEach((button, i) => {
      if (!button) return;
      const dx = button.offsetLeft + button.offsetWidth / 2 - centerX;
      const dy = button.offsetTop + button.offsetHeight / 2 - centerY;
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    return best;
  };

  /**
   * SUDRASH TRACK ustida ushlanadi, yostiqning o'zida emas: tugmalar
   * yostiqning USTIDA turadi (matn ko'rinishi uchun) va bosishni o'zi
   * yutib yuborardi - shuning uchun barmoq tekkan joyni o'zimiz
   * tekshiramiz. Sudrash faqat YOSTIQNING ustidan boshlansa ishlaydi.
   */
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const pillNode = pillRef.current;
    if (!pill || !pillNode) return;
    const rect = pillNode.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = { startX: event.clientX, baseLeft: pill.left };
    moved.current = false;
    setIsDragging(true);
    setDragDx(0);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragging.current;
    const track = trackRef.current;
    if (!state || !pill || !track) return;
    const dx = event.clientX - state.startX;
    if (Math.abs(dx) > 3) moved.current = true;
    // Yostiq ramkadan chiqib ketmasin.
    const maxLeft = track.clientWidth - pill.width;
    const next = Math.min(Math.max(state.baseLeft + dx, 0), Math.max(0, maxLeft));
    setDragDx(next - pill.left);
    setHoverIndex(nearest(next + pill.width / 2, pill.top + pill.height / 2));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragging.current;
    if (!state || !pill) return;
    dragging.current = null;
    setIsDragging(false);
    setHoverIndex(null);
    const centerX = pill.left + dragDx + pill.width / 2;
    const centerY = pill.top + pill.height / 2;
    setDragDx(0);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!moved.current) return;

    const target = options[nearest(centerX, centerY)];
    if (target && target.value !== value) onChange(target.value);
  };

  const step = (delta: number) => {
    const next = options[Math.min(options.length - 1, Math.max(0, index + delta))];
    if (next && next.value !== value) onChange(next.value);
  };

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          step(-1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          step(1);
        }
      }}
      // Turlar ko'p bo'lsa ular ekrandan CHIQIB KETMAYDI - keyingi
      // qatorga o'tadi (ilgari gorizontal aylanardi va oxirgi variant
      // yarim ko'rinib turardi). Shu sabab burchak ham "pill" emas,
      // yumshoq rounded - ikki qatorda dumaloq ramka xunuk ko'rinardi.
      className="relative w-full rounded-3xl border border-navy-100 p-1 dark:border-navy-500"
    >
      {/* Suriladigan yostiq. Tugmalardan PASTDA turadi (matn ustiga
          chiqmasligi uchun), sudrash esa track ustida ushlanadi. */}
      {pill && (
        <div
          ref={pillRef}
          style={{
            transform: `translate(${pill.left + dragDx}px, ${pill.top}px)`,
            width: pill.width,
            height: pill.height,
            transition: isDragging ? "none" : "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          className="absolute left-0 top-0 z-0 rounded-full bg-aqua-500 shadow-sm"
          aria-hidden
        />
      )}

      <div className="relative flex flex-wrap items-center gap-1">
        {options.map((option, i) => {
          // Sudralayotganda oq matn yostiq bilan BIRGA yuradi -
          // yostiq qaysi variant ustida turgani ko'rinib tursin.
          const selected = hoverIndex !== null ? i === hoverIndex : option.value === value;
          return (
            <button
              key={option.value}
              ref={(node) => {
                buttonsRef.current[i] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                // Sudrashdan keyingi "click" ni o'tkazib yuboramiz -
                // aks holda barmoq ostidagi tugma tanlanib qolardi.
                if (moved.current) {
                  moved.current = false;
                  return;
                }
                onChange(option.value);
              }}
              className={[
                "relative z-10 flex-1 whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors",
                selected
                  ? "font-semibold text-white"
                  : "text-navy-900 hover:text-aqua-700 dark:text-white dark:hover:text-aqua-200",
                option.dimmed ? "opacity-50" : "",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
