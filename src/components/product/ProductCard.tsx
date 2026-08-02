"use client";

import Image from "next/image";
import Link from "next/link";
import { Chip, Button } from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import { useAppDispatch } from "@/redux/hooks";
import { addItem } from "@/redux/slices/cartSlice";
import { isDiscountActive } from "@/lib/products/pricing";
import { hasVariants, minVariantPrice } from "@/lib/products/variants";
import { useCategoryLabel } from "@/lib/products/useTaxonomy";
import { FavoriteButton } from "./FavoriteButton";
import { StarRating } from "./StarRating";
import type { Product } from "@/types/product";

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

export function ProductCard({ product }: { product: Product }) {
  const dispatch = useAppDispatch();
  // Kategoriya nomi ro'yxatdan olinadi - admin qo'shgan yangi
  // kategoriyalar ham ko'rinadi (ilgari kodda 8 tasi yozilgan edi).
  const categoryLabel = useCategoryLabel(product.category);
  // Brend/davlat bo'sh bo'lsa yolg'iz "•" qolib ketmasligi kerak.
  const meta = [product.brand, product.manufacturerCountry].filter(Boolean).join(" • ");
  // Chegirma muddati o'tgan bo'lsa - to'liq narx ko'rsatiladi.
  const hasDiscount = isDiscountActive(product);
  const outOfStock = product.stock <= 0;
  /** Turlari bo'lsa narx "eng arzonidan" bo'ladi va tur sahifada tanlanadi. */
  const withVariants = hasVariants(product);
  const cardPrice = withVariants
    ? (minVariantPrice(product) ?? product.price)
    : hasDiscount
      ? product.discountPrice!
      : product.price;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl2 border border-navy-100 bg-white transition hover:shadow-lg dark:border-navy-500 dark:bg-navy-700">
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
          <div className="flex h-full items-center justify-center text-navy-300">Rasm yo&apos;q</div>
        )}
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-navy-900/80 px-2 py-0.5 text-xs text-white">
            Tugagan
          </span>
        )}
      </Link>

      <div className="absolute right-1 top-1">
        <FavoriteButton product={product} className="!bg-white/80 dark:!bg-navy-900/70" />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {categoryLabel && (
          <Chip label={categoryLabel} size="small" className="!w-fit !bg-aqua-50 !text-aqua-700 dark:!bg-navy-500 dark:!text-aqua-100" />
        )}

        <Link href={`/mahsulot/${product.id}`} className="line-clamp-2 text-sm font-medium text-navy-900 hover:text-aqua-600 dark:text-white">
          {product.name}
        </Link>

        {meta && <p className="text-xs text-navy-300">{meta}</p>}

        {(product.ratingCount ?? 0) > 0 && (
          <p className="flex items-center gap-1 text-xs text-navy-300">
            <StarRating value={product.ratingAvg ?? 0} />
            {product.ratingAvg?.toFixed(1)}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex flex-col">
            {hasDiscount && !withVariants && (
              <span className="text-xs text-navy-300 line-through">{formatSom(product.price)}</span>
            )}
            <span className="font-bold text-navy-900 dark:text-white">
              {formatSom(cardPrice)}
              {withVariants && <span className="text-xs font-normal text-navy-300"> dan</span>}
            </span>
          </div>

          {/* Turlari bo'lsa savatga to'g'ridan-to'g'ri qo'shilmaydi -
              avval o'lchami/rangi tanlanishi kerak. */}
          {withVariants ? (
            <Button size="small" variant="contained" color="primary" component={Link} href={`/mahsulot/${product.id}`}>
              Turini tanlash
            </Button>
          ) : (
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
              aria-label={`${product.name} savatga qo'shish`}
            >
              <AddShoppingCartIcon fontSize="small" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
