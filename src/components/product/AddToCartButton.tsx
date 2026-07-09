"use client";

import { Button } from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import { useAppDispatch } from "@/redux/hooks";
import { addItem } from "@/redux/slices/cartSlice";
import { useI18n } from "@/lib/i18n/LocaleContext";
import type { Product } from "@/types/product";

export function AddToCartButton({ product }: { product: Product }) {
  const dispatch = useAppDispatch();
  const { dict } = useI18n();
  const hasDiscount = !!product.discountPrice && product.discountPrice < product.price;
  const outOfStock = product.stock <= 0;

  return (
    <Button
      variant="contained"
      size="large"
      startIcon={<AddShoppingCartIcon />}
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
    >
      {outOfStock ? dict.product.outOfStock : dict.product.addToCart}
    </Button>
  );
}
