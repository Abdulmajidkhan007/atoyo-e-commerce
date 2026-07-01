import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
  productId: string;
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

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<Omit<CartItem, "quantity"> & { quantity?: number }>) {
      const existing = state.items.find((i) => i.productId === action.payload.productId);
      const qtyToAdd = action.payload.quantity ?? 1;
      if (existing) {
        existing.quantity = Math.min(existing.quantity + qtyToAdd, existing.stock);
      } else {
        state.items.push({ ...action.payload, quantity: qtyToAdd });
      }
    },
    removeItem(state, action: PayloadAction<{ productId: string }>) {
      state.items = state.items.filter((i) => i.productId !== action.payload.productId);
    },
    updateQuantity(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const item = state.items.find((i) => i.productId === action.payload.productId);
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
