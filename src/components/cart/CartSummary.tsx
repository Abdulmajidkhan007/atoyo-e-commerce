"use client";

import Link from "next/link";
import { Button } from "@mui/material";
import { useAppSelector } from "@/redux/hooks";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { usePricingSettings } from "@/lib/products/usePricing";
import { formatSom } from "@/lib/format";

export function CartSummary() {
  const { dict } = useI18n();
  const items = useAppSelector((s) => s.cart.items);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  // Eng kam buyurtma summasi: serverda ham tekshiriladi, lekin mijoz
  // buni rasmiylashtirishdan OLDIN bilishi kerak.
  const { minOrderAmount } = usePricingSettings();
  const belowMinimum = minOrderAmount > 0 && items.length > 0 && totalAmount < minOrderAmount;

  return (
    <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700">
      <div className="flex items-center justify-between text-sm text-navy-300">
        <span>{dict.product.products} ({totalCount})</span>
        <span>{formatSom(totalAmount)}</span>
      </div>
      <div className="flex items-center justify-between text-lg font-bold text-navy-900 dark:text-white">
        <span>{dict.product.total}</span>
        <span>{formatSom(totalAmount)}</span>
      </div>
      {belowMinimum && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Eng kam buyurtma summasi — {formatSom(minOrderAmount)}. Yana{" "}
          {formatSom(minOrderAmount - totalAmount)} lik mahsulot qo&apos;shing.
        </p>
      )}
      <Button
        component={Link}
        href="/buyurtma"
        variant="contained"
        color="primary"
        size="large"
        disabled={items.length === 0 || belowMinimum}
        fullWidth
      >
        {dict.product.order}
      </Button>
    </div>
  );
}
