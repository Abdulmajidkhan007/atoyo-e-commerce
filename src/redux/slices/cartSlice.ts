import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
  productId: string;
  /**
   * Tanlangan tur (o'lcham/rang/qalinlik) kaliti. Turlari yo'q
   * mahsulotlarda bo'lmaydi. Savatda bir mahsulotning turli turlari
   * ALOHIDA qator bo'lib turadi.
   */
  variantId?: string;
  /** "50x60 • 0.3mm" - savatda va buyurtmada ko'rinadigan nom. */
  variantLabel?: string;
  name: string;
  price: number;
  thumbnailUrl: string;
  quantity: number;
  stock: number;
}

interface CartState {
  items: CartItem[];
}

const initialState: CartState = { items: [] };

/** Savat qatorining kaliti: mahsulot + tanlangan turi. */
function sameLine(item: CartItem, productId: string, variantId?: string): boolean {
  return item.productId === productId && (item.variantId ?? "") === (variantId ?? "");
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<Omit<CartItem, "quantity"> & { quantity?: number }>) {
      const existing = state.items.find((i) =>
        sameLine(i, action.payload.productId, action.payload.variantId)
      );
      const qtyToAdd = action.payload.quantity ?? 1;
      if (existing) {
        existing.quantity = Math.min(existing.quantity + qtyToAdd, existing.stock);
      } else {
        state.items.push({ ...action.payload, quantity: qtyToAdd });
      }
    },
    removeItem(state, action: PayloadAction<{ productId: string; variantId?: string }>) {
      state.items = state.items.filter(
        (i) => !sameLine(i, action.payload.productId, action.payload.variantId)
      );
    },
    updateQuantity(
      state,
      action: PayloadAction<{ productId: string; variantId?: string; quantity: number }>
    ) {
      const item = state.items.find((i) =>
        sameLine(i, action.payload.productId, action.payload.variantId)
      );
      if (item) {
        item.quantity = Math.max(1, Math.min(action.payload.quantity, item.stock));
      }
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { addItem, removeItem, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
