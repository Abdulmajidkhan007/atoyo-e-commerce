"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { IconButton, LinearProgress } from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { Link } from "@/lib/i18n/LocaleLink";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { addItem } from "@/redux/slices/cartSlice";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { useDelivery } from "@/lib/delivery/useDelivery";
import { freeDeliveryGap } from "@/lib/delivery/text";
import { effectivePrice } from "@/lib/products/pricing";
import { formatSom } from "@/lib/format";
import type { Product } from "@/types/product";

/** Farq o'zgarganda qayta so'rashdan oldin kutish (miqdor tez bosilsa). */
const DEBOUNCE_MS = 400;

/**
 * "BEPUL YETKAZISHGA X SO'M QOLDI" + FARQNI YOPADIGAN MAHSULOTLAR.
 *
 * Kichik buyurtma (4 000 so'mlik lipuchka) uchun do'kon taksiga
 * 15 000 so'm to'lab o'tirmasin, mijoz esa yetkazish uchun
 * "havoga" pul to'lamasin: chiziq qancha qolganini ko'rsatadi, ostida
 * esa BITTA qo'shish bilan farqni yopadigan mahsulotlar
 * (`/api/products/gap-fillers`, tartibi `lib/products/gap-fillers.ts`).
 *
 * Yetkazish bepul bo'lsa yoki chegara yo'q bo'lsa — hech narsa
 * chizilmaydi (`freeDeliveryGap` → `null`).
 *
 * Summa promokodgacha olinadi (savatdagi summa) — yakuniy hisob
 * baribir serverda (`deliveryFeeFor`).
 */
export function FreeDeliveryProgress({ className = "" }: { className?: string }) {
  const dispatch = useAppDispatch();
  const { dict } = useI18n();
  const delivery = useDelivery();
  const items = useAppSelector((s) => s.cart.items);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gap = freeDeliveryGap(delivery, subtotal);
  const [suggestions, setSuggestions] = useState<Product[]>([]);

  const remaining = gap?.remaining ?? 0;
  const excludeKey = useMemo(() => [...new Set(items.map((item) => item.productId))].join(","), [items]);
  const categoriesKey = useMemo(
    () => [...new Set(items.map((item) => item.category).filter(Boolean))].join(","),
    [items]
  );

  useEffect(() => {
    if (remaining <= 0) return;
    let active = true;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ gap: String(remaining), exclude: excludeKey, categories: categoriesKey });
      fetch(`/api/products/gap-fillers?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { products?: Product[] } | null) => {
          if (active) setSuggestions(data?.products ?? []);
        })
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [remaining, excludeKey, categoriesKey]);

  if (!gap || items.length === 0) return null;
  const reached = gap.remaining <= 0;
  // Farq yopilgan bo'lsa eski tavsiyalar ko'rinmasin (so'rov ketmaydi).
  const visible = reached ? [] : suggestions;

  return (
    <div
      className={`rounded-xl2 border border-aqua-500/30 bg-aqua-50/60 p-4 dark:border-aqua-500/30 dark:bg-navy-800 ${className}`}
    >
      {/* `aria-live` - miqdor o'zgarganda ekran o'quvchi yangi summani aytadi. */}
      <p aria-live="polite" className="flex items-center gap-2 text-sm font-semibold text-navy-900 dark:text-white">
        <LocalShippingOutlinedIcon fontSize="small" className="text-aqua-600" />
        {reached
          ? dict.cart.freeDeliveryReached
          : dict.cart.freeDeliveryLeft.replace("{amount}", formatSom(gap.remaining))}
      </p>
      <LinearProgress
        variant="determinate"
        value={gap.progress}
        aria-hidden
        className="!mt-2 !h-2 !rounded-full"
        color={reached ? "success" : "primary"}
      />
      {!reached && (
        <p className="mt-1.5 text-xs text-navy-300">{dict.cart.deliveryNow.replace("{fee}", formatSom(gap.fee))}</p>
      )}

      {visible.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-navy-500 dark:text-navy-100">{dict.cart.fillGapTitle}</p>
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visible.map((product) => {
              const price = Math.round(effectivePrice(product));
              const image = product.images?.[0] ?? product.thumbnailUrl;
              return (
                <li
                  key={product.id}
                  className="flex w-36 shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm dark:bg-navy-700"
                >
                  <Link href={`/mahsulot/${product.id}`} className="block">
                    <span className="relative block aspect-square bg-navy-50 dark:bg-navy-900">
                      {image && <Image src={image} alt="" fill sizes="144px" className="object-cover" />}
                    </span>
                    <span className="line-clamp-2 px-2 pt-1.5 text-xs text-navy-900 dark:text-white">
                      {product.name}
                    </span>
                  </Link>
                  <span className="mt-auto flex items-center justify-between gap-1 px-2 pb-1.5">
                    <span className="text-xs font-bold text-navy-900 dark:text-white">{formatSom(price)}</span>
                    <IconButton
                      size="small"
                      color="primary"
                      aria-label={`${product.name} — ${dict.product.addToCart}`}
                      onClick={() =>
                        dispatch(
                          addItem({
                            productId: product.id,
                            name: product.name,
                            price,
                            thumbnailUrl: product.thumbnailUrl,
                            category: product.category,
                            stock: product.stock,
                          })
                        )
                      }
                    >
                      <AddShoppingCartIcon fontSize="small" />
                    </IconButton>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
