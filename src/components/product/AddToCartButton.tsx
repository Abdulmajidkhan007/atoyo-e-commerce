"use client";

import { Button } from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import { useAppDispatch } from "@/redux/hooks";
import { addItem } from "@/redux/slices/cartSlice";
import type { Product } from "@/types/product";

export function AddToCartButton({ product }: { product: Product }) {
  const dispatch = useAppDispatch();
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
      {outOfStock ? "Mahsulot tugagan" : "Savatga qo'shish"}
    </Button>
  );
}
