"use client";

import { IconButton } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { toggleFavorite } from "@/redux/slices/favoritesSlice";
import { effectivePrice } from "@/lib/products/pricing";
import type { Product } from "@/types/product";

/** Mahsulotni sevimlilarga qo'shish/olib tashlash (yurak tugmasi). */
export function FavoriteButton({ product, className }: { product: Product; className?: string }) {
  const dispatch = useAppDispatch();
  const isFavorite = useAppSelector((s) => s.favorites.items.some((i) => i.productId === product.id));

  return (
    <IconButton
      size="small"
      aria-label={isFavorite ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo'shish"}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch(
          toggleFavorite({
            productId: product.id,
            name: product.name,
            price: effectivePrice(product),
            thumbnailUrl: product.thumbnailUrl,
          })
        );
      }}
    >
      {isFavorite ? (
        <FavoriteIcon fontSize="small" className="text-red-500" />
      ) : (
        <FavoriteBorderIcon fontSize="small" className="text-navy-300" />
      )}
    </IconButton>
  );
}
