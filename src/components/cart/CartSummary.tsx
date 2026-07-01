"use client";

import Link from "next/link";
import { Button } from "@mui/material";
import { useAppSelector } from "@/redux/hooks";

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

export function CartSummary() {
  const items = useAppSelector((s) => s.cart.items);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700">
      <div className="flex items-center justify-between text-sm text-navy-300">
        <span>Mahsulotlar ({totalCount})</span>
        <span>{formatSom(totalAmount)}</span>
      </div>
      <div className="flex items-center justify-between text-lg font-bold text-navy-900 dark:text-white">
        <span>Jami</span>
        <span>{formatSom(totalAmount)}</span>
      </div>
      <Button
        component={Link}
        href="/buyurtma"
        variant="contained"
        color="primary"
        size="large"
        disabled={items.length === 0}
        fullWidth
      >
        Buyurtma berish
      </Button>
    </div>
  );
}
