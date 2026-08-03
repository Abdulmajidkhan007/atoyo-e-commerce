"use client";

import { useMemo, useState } from "react";
import { Button } from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import { useAppDispatch } from "@/redux/hooks";
import { addItem } from "@/redux/slices/cartSlice";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { defaultVariant, findVariant, variantLabel, variantPrice } from "@/lib/products/variants";
import type { Product } from "@/types/product";

/**
 * TUR TANLASH (o'lcham / qalinlik / rang...) va savatga qo'shish.
 *
 * Mahsulotning turlari bo'lsa mijoz shu yerdan tanlaydi - narx va zaxira
 * tanlangan turga qarab darhol o'zgaradi (pitsa ilovalaridagi kabi).
 * Savatga ham aynan shu tur qo'shiladi.
 */
export function ProductVariantPicker({ product, unitLabel }: { product: Product; unitLabel: string }) {
  const dispatch = useAppDispatch();
  const { dict } = useI18n();
  const axes = product.variantAxes ?? [];

  const [selection, setSelection] = useState<Record<string, string>>(
    () => defaultVariant(product)?.options ?? {}
  );

  const variant = useMemo(() => findVariant(product, selection), [product, selection]);
  const price = variant ? variantPrice(variant) : product.price;
  const stock = variant?.stock ?? 0;
  const outOfStock = stock <= 0;

  /** Shu qiymat tanlansa mavjud tur chiqadimi (yo'q bo'lsa - kulrang). */
  const isValueAvailable = (axisKey: string, value: string) =>
    (product.variants ?? []).some((v) => v.options[axisKey] === value && v.stock > 0);

  return (
    <div className="flex flex-col gap-4">
      {axes.map((axis) => (
        <div key={axis.key} className="flex flex-col gap-1.5">
          <span className="text-sm text-navy-300">{axis.label}</span>
          {/* Variantlar bitta "o'rab turuvchi" ramka ichida; tanlangani
              ramka ichida rang bilan ajralib turadi (segment tanlagich).
              Pastki-chap burchak to'g'ri qoldirilgan - shakl brenddagi
              "qirqilgan burchak" uslubiga mos keladi. */}
          <div className="inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-full rounded-bl-none border border-navy-100 p-1 dark:border-navy-500">
            {axis.values.map((value) => {
              const isSelected = selection[axis.key] === value;
              const available = isValueAvailable(axis.key, value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelection((prev) => ({ ...prev, [axis.key]: value }))}
                  aria-pressed={isSelected}
                  className={[
                    "rounded-full px-4 py-1.5 text-sm transition",
                    // Tanlangan variant ostidagi rangli "yostiq" - shu
                    // tugmaning orqasiga o'tadi.
                    isSelected
                      ? "bg-aqua-500 font-semibold text-white shadow-sm"
                      : "text-navy-900 hover:bg-aqua-500/15 dark:text-white",
                    available ? "" : "opacity-50",
                  ].join(" ")}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-baseline gap-2">
        {variant?.discountPrice ? (
          <span className="text-navy-300 line-through">
            {variant.price.toLocaleString("uz-UZ")} so&apos;m
          </span>
        ) : null}
        <span className="text-2xl font-bold text-navy-900 dark:text-white">
          {price.toLocaleString("uz-UZ")} so&apos;m
        </span>
        <span className="text-sm text-navy-300">/ {unitLabel}</span>
      </div>

      <p className="text-sm text-navy-300">
        {dict.product.inStock}:{" "}
        <span className="font-medium text-navy-900 dark:text-white">
          {stock} {unitLabel}
        </span>
      </p>

      <Button
        variant="contained"
        size="large"
        startIcon={<AddShoppingCartIcon />}
        disabled={outOfStock || !variant}
        className="!w-fit"
        onClick={() => {
          if (!variant) return;
          dispatch(
            addItem({
              productId: product.id,
              variantId: variant.id,
              variantLabel: variantLabel(product, variant),
              name: product.name,
              price,
              thumbnailUrl: product.thumbnailUrl,
              stock: variant.stock,
            })
          );
        }}
      >
        {outOfStock ? dict.product.outOfStock : dict.product.addToCart}
      </Button>
    </div>
  );
}
