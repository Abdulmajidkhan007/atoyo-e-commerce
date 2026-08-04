"use client";

import { Button } from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import { useAppDispatch } from "@/redux/hooks";
import { addItem } from "@/redux/slices/cartSlice";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { effectivePrice } from "@/lib/products/pricing";
import { useDisplayPrice } from "@/lib/products/usePricing";
import type { Product } from "@/types/product";

export function AddToCartButton({ product }: { product: Product }) {
  const dispatch = useAppDispatch();
  // Savatga rolga mos narx tushadi (server buyurtmada baribir qayta hisoblaydi).
  const show = useDisplayPrice(product);
  const { dict } = useI18n();
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
            price: show(effectivePrice(product)),
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
