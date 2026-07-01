"use client";

import Link from "next/link";
import { Button } from "@mui/material";
import { useAppSelector } from "@/redux/hooks";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { CartSummary } from "@/components/cart/CartSummary";

export default function CartPage() {
  const items = useAppSelector((s) => s.cart.items);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-navy-900 dark:text-white">Savat</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-navy-300">Savatingiz hozircha bo&apos;sh.</p>
          <Button component={Link} href="/katalog" variant="contained">
            Katalogga o&apos;tish
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl2 border border-navy-100 bg-white px-4 md:col-span-2 dark:border-navy-500 dark:bg-navy-700">
            {items.map((item) => (
              <CartItemRow key={item.productId} item={item} />
            ))}
          </div>

          <div>
            <CartSummary />
          </div>
        </div>
      )}
    </section>
  );
}
