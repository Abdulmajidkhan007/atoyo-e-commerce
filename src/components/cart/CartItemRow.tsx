"use client";

import Image from "next/image";
import Link from "next/link";
import { IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useAppDispatch } from "@/redux/hooks";
import { removeItem, updateQuantity } from "@/redux/slices/cartSlice";
import type { CartItem } from "@/redux/slices/cartSlice";
import { formatSom } from "@/lib/format";

/**
 * SAVATDAGI BITTA QATOR.
 *
 * TOR EKRANDA (320-360px) qator ichidagi hamma narsa - rasm, nom,
 * son o'zgartirgich, summa va o'chirish tugmasi - bir qatorga
 * sig'masdi va mahsulot nomi qisilib, summa esa ekrandan chiqib
 * ketardi. Endi qator IKKIGA bo'linadi:
 *
 *   [rasm] [nom / tur / dona narx] [🗑]
 *   [− 1 +]                    [jami summa]
 *
 * `sm` va undan katta ekranda hammasi avvalgidek bitta qatorda.
 */
export function CartItemRow({ item }: { item: CartItem }) {
  const dispatch = useAppDispatch();

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-navy-100 py-4 last:border-b-0 dark:border-navy-500">
      <Link
        href={`/mahsulot/${item.productId}`}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-navy-50 sm:h-16 sm:w-16 dark:bg-navy-900"
      >
        {item.thumbnailUrl ? (
          <Image src={item.thumbnailUrl} alt={item.name} fill sizes="64px" className="object-cover" />
        ) : null}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/mahsulot/${item.productId}`}
          className="line-clamp-2 text-sm font-medium leading-snug text-navy-900 hover:text-aqua-600 dark:text-white"
        >
          {item.name}
        </Link>
        {/* Tanlangan tur (o'lcham/rang) - savatda ham ko'rinib tursin. */}
        {item.variantLabel && <p className="text-xs text-aqua-600">{item.variantLabel}</p>}
        <p className="text-xs text-navy-300 sm:text-sm">{formatSom(item.price)}</p>
      </div>

      {/* O'chirish - katta ekranda eng oxirida turadi. */}
      <IconButton
        size="small"
        aria-label="Savatdan o'chirish"
        className="shrink-0 sm:!order-last"
        onClick={() => dispatch(removeItem({ productId: item.productId, variantId: item.variantId }))}
      >
        <DeleteOutlineIcon fontSize="small" className="text-red-400" />
      </IconButton>

      {/* Tor ekranda butun kenglikni egallab, ostki qatorga tushadi. */}
      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
        <div className="flex items-center gap-1 rounded-full border border-navy-100 dark:border-navy-500">
          <IconButton
            size="small"
            aria-label="Sonini kamaytirish"
            onClick={() =>
              dispatch(
                updateQuantity({
                  productId: item.productId,
                  variantId: item.variantId,
                  quantity: item.quantity - 1,
                })
              )
            }
            disabled={item.quantity <= 1}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <span className="w-6 text-center text-sm">{item.quantity}</span>
          <IconButton
            size="small"
            aria-label="Sonini oshirish"
            onClick={() =>
              dispatch(
                updateQuantity({
                  productId: item.productId,
                  variantId: item.variantId,
                  quantity: item.quantity + 1,
                })
              )
            }
            disabled={item.quantity >= item.stock}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </div>

        <p className="shrink-0 text-right text-sm font-semibold text-navy-900 sm:min-w-[6.5rem] dark:text-white">
          {formatSom(item.price * item.quantity)}
        </p>
      </div>
    </div>
  );
}
