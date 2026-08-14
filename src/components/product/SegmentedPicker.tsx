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
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
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
    setPill({ left: button.offsetLeft, width: button.offsetWidth });
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

  /** Yostiq markaziga eng yaqin variant. */
  const nearest = (center: number) => {
    let best = index;
    let bestDistance = Infinity;
    buttonsRef.current.forEach((button, i) => {
      if (!button) return;
      const distance = Math.abs(button.offsetLeft + button.offsetWidth / 2 - center);
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
    const maxLeft = track.scrollWidth - pill.width;
    const next = Math.min(Math.max(state.baseLeft + dx, 0), Math.max(0, maxLeft));
    setDragDx(next - pill.left);
    setHoverIndex(nearest(next + pill.width / 2));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragging.current;
    if (!state || !pill) return;
    dragging.current = null;
    setIsDragging(false);
    setHoverIndex(null);
    const center = pill.left + dragDx + pill.width / 2;
    setDragDx(0);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!moved.current) return;

    const target = options[nearest(center)];
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
      className="relative w-full touch-pan-y overflow-x-auto rounded-full border border-navy-100 p-1 dark:border-navy-500"
    >
      {/* Suriladigan yostiq. Tugmalardan PASTDA turadi (matn ustiga
          chiqmasligi uchun), sudrash esa track ustida ushlanadi. */}
      {pill && (
        <div
          ref={pillRef}
          style={{
            transform: `translateX(${pill.left + dragDx}px)`,
            width: pill.width,
            transition: isDragging ? "none" : "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          className="absolute inset-y-1 left-0 z-0 rounded-full bg-aqua-500 shadow-sm"
          aria-hidden
        />
      )}

      <div className="relative flex min-w-full items-center gap-1">
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
