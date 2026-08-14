"use client";

import { useMemo, useState } from "react";
import { Button } from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import { useAppDispatch } from "@/redux/hooks";
import { addItem } from "@/redux/slices/cartSlice";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { defaultVariant, findVariant, variantLabel, variantPrice } from "@/lib/products/variants";
import { useDisplayPrice, useIsWholesale } from "@/lib/products/usePricing";
import type { Product } from "@/types/product";
import { formatSom } from "@/lib/format";
import { SegmentedPicker } from "./SegmentedPicker";

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
  // Bazadagi narx optom - ko'rsatishda rolga qarab o'giriladi.
  const show = useDisplayPrice(product);
  const isWholesale = useIsWholesale();
  const price = show(variant ? variantPrice(variant) : product.price);
  const stock = variant?.stock ?? 0;
  const outOfStock = stock <= 0;

  /** Shu qiymat tanlansa mavjud tur chiqadimi (yo'q bo'lsa - kulrang). */
  const isValueAvailable = (axisKey: string, value: string) =>
    (product.variants ?? []).some((v) => v.options[axisKey] === value && v.stock > 0);

  /**
   * Qatorda faqat HAQIQATAN turi bor qiymatlar ko'rsatiladi.
   *
   * Tur o'chirilganda (masalan sinov uchun qo'shilgani) qiymat
   * qatorda qolib ketishi mumkin edi - o'sha tugma bosilsa mos tur
   * topilmay, mahsulot "tugagan" bo'lib ko'rinardi.
   */
  const usableValues = (axis: (typeof axes)[number]) =>
    axis.values.filter((value) =>
      (product.variants ?? []).some((v) => v.options[axis.key] === value)
    );

  return (
    <div className="flex flex-col gap-4">
      {axes.map((axis) => {
        const values = usableValues(axis);
        if (values.length === 0) return null;
        return (
        <div key={axis.key} className="flex flex-col gap-1.5">
          <span className="text-sm text-navy-300">{axis.label}</span>
          {/* Segment tanlagich: ramka BUTUN KENGLIKDA, variantlar teng
              bo'linadi. Tanlangan variantning orqasidagi "yostiq"
              surilib boradi va uni ushlab chapga-o'ngga sudrab ham
              tanlash mumkin (`SegmentedPicker`). */}
          <SegmentedPicker
            ariaLabel={axis.label}
            value={selection[axis.key] ?? ""}
            onChange={(value) => setSelection((prev) => ({ ...prev, [axis.key]: value }))}
            options={values.map((value) => ({
              value,
              label: value,
              dimmed: !isValueAvailable(axis.key, value),
            }))}
          />
        </div>
        );
      })}

      <div className="flex items-baseline gap-2">
        {variant?.discountPrice ? (
          <span className="text-navy-300 line-through">
            {formatSom(show(variant.price))}
          </span>
        ) : null}
        <span className="text-2xl font-bold text-navy-900 dark:text-white">
          {formatSom(price)}
        </span>
        <span className="text-sm text-navy-300">/ {unitLabel}</span>
        {/* Optom mijozga narx optom ekani aniq ko'rinib tursin. */}
        {isWholesale && (
          <span className="rounded-full bg-aqua-500/15 px-2 py-0.5 text-xs font-medium text-aqua-700 dark:text-aqua-200">
            optom
          </span>
        )}
      </div>

      {/* TANLANGAN TURNING KODI - mijoz shu kod bilan buyurtma beradi
          (kanal postida ham shu kod turadi). Turlari yo'q mahsulotda
          umumiy kod ko'rsatiladi. */}
      {(variant?.sku || product.sku) && (
        <p className="text-sm text-navy-300">
          Kod:{" "}
          <span className="font-medium text-navy-900 dark:text-white">
            {variant?.sku || product.sku}
          </span>
        </p>
      )}

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
