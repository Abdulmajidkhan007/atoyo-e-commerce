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
import { useTranslation } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";

export function CartItemRow({ item }: { item: CartItem }) {
  const dispatch = useAppDispatch();
  const t = useTranslation();
  const formatSom = (amount: number) => formatPrice(amount, t.common.currencyUzs);

  return (
    <div className="flex items-center gap-3 border-b border-navy-100 py-4 last:border-b-0 dark:border-navy-500">
      <Link href={`/mahsulot/${item.productId}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-navy-50 dark:bg-navy-900">
        {item.thumbnailUrl ? (
          <Image src={item.thumbnailUrl} alt={item.name} fill sizes="64px" className="object-cover" />
        ) : null}
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/mahsulot/${item.productId}`} className="line-clamp-1 text-sm font-medium text-navy-900 hover:text-aqua-600 dark:text-white">
          {item.name}
        </Link>
        <p className="text-sm text-navy-300">{formatSom(item.price)}</p>
      </div>

      <div className="flex items-center gap-1 rounded-full border border-navy-100 dark:border-navy-500">
        <IconButton
          size="small"
          aria-label={t.cart.decrease}
          onClick={() => dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity - 1 }))}
          disabled={item.quantity <= 1}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
        <span className="w-6 text-center text-sm">{item.quantity}</span>
        <IconButton
          size="small"
          aria-label={t.cart.increase}
          onClick={() => dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity + 1 }))}
          disabled={item.quantity >= item.stock}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </div>

      <p className="w-28 shrink-0 text-right text-sm font-semibold text-navy-900 dark:text-white">
        {formatSom(item.price * item.quantity)}
      </p>

      <IconButton
        size="small"
        aria-label={t.cart.remove}
        onClick={() => dispatch(removeItem({ productId: item.productId }))}
      >
        <DeleteOutlineIcon fontSize="small" className="text-red-400" />
      </IconButton>
    </div>
  );
}
