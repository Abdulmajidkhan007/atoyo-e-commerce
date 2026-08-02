import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {CartItem} from '../types';

interface CartState {
  items: CartItem[];
}

const initialState: CartState = {items: []};

/** Savat - saytdagi cartSlice bilan bir xil mantiq (AsyncStorage'da saqlanadi). */
/**
 * Savat qatorining kaliti: mahsulot + tanlangan turi. Bir mahsulotning
 * turli o'lchamlari savatda alohida qator bo'lib turadi.
 */
function sameLine(
  item: {productId: string; variantId?: string},
  target: {productId: string; variantId?: string},
): boolean {
  return item.productId === target.productId && (item.variantId ?? '') === (target.variantId ?? '');
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find(i => sameLine(i, action.payload));
      if (existing) existing.quantity += action.payload.quantity;
      else state.items.push(action.payload);
    },
    setQuantity(
      state,
      action: PayloadAction<{productId: string; variantId?: string; quantity: number}>,
    ) {
      const item = state.items.find(i => sameLine(i, action.payload));
      if (!item) return;
      item.quantity = action.payload.quantity;
      if (item.quantity <= 0) {
        state.items = state.items.filter(i => !sameLine(i, action.payload));
      }
    },
    removeItem(state, action: PayloadAction<{productId: string; variantId?: string}>) {
      state.items = state.items.filter(i => !sameLine(i, action.payload));
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const {addItem, setQuantity, removeItem, clearCart} = cartSlice.actions;
export default cartSlice.reducer;
