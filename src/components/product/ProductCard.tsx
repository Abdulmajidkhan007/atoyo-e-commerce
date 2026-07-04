"use client";

import Image from "next/image";
import Link from "next/link";
import { Chip, Button } from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import { useAppDispatch } from "@/redux/hooks";
import { addItem } from "@/redux/slices/cartSlice";
import { useTranslation } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/product";

export function ProductCard({ product }: { product: Product }) {
  const dispatch = useAppDispatch();
  const t = useTranslation();
  const hasDiscount = !!product.discountPrice && product.discountPrice < product.price;
  const outOfStock = product.stock <= 0;
  const formatSom = (amount: number) => formatPrice(amount, t.common.currencyUzs);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl2 border border-navy-100 bg-white transition hover:shadow-lg dark:border-navy-500 dark:bg-navy-700">
      <Link href={`/mahsulot/${product.id}`} className="relative block aspect-square bg-navy-50 dark:bg-navy-900">
        {product.thumbnailUrl ? (
          <Image
            src={product.thumbnailUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-navy-300">{t.product.noImage}</div>
        )}
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-navy-900/80 px-2 py-0.5 text-xs text-white">
            {t.product.outOfStockBadge}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Chip label={t.categories[product.category]} size="small" className="!w-fit !bg-aqua-50 !text-aqua-700 dark:!bg-navy-500 dark:!text-aqua-100" />

        <Link href={`/mahsulot/${product.id}`} className="line-clamp-2 text-sm font-medium text-navy-900 hover:text-aqua-600 dark:text-white">
          {product.name}
        </Link>

        <p className="text-xs text-navy-300">{product.brand} • {product.manufacturerCountry}</p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex flex-col">
            {hasDiscount && (
              <span className="text-xs text-navy-300 line-through">{formatSom(product.price)}</span>
            )}
            <span className="font-bold text-navy-900 dark:text-white">
              {formatSom(hasDiscount ? product.discountPrice! : product.price)}
            </span>
          </div>

          <Button
            size="small"
            variant="contained"
            color="primary"
            disabled={outOfStock}
            onClick={() =>
              dispatch(
                addItem({
                  productId: product.id,
                  name: product.name,
                  price: hasDiscount ? product.discountPrice! : product.price,
                  thumbnailUrl: product.thumbnailUrl,
                  stock: product.stock,
                })
              )
            }
            aria-label={t.product.addToCartAria.replace("{name}", product.name)}
          >
            <AddShoppingCartIcon fontSize="small" />
          </Button>
        </div>
      </div>
    </div>
  );
}
