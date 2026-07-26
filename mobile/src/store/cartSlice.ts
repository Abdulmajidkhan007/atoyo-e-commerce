import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {CartItem} from '../types';

interface CartState {
  items: CartItem[];
}

const initialState: CartState = {items: []};

/** Savat - saytdagi cartSlice bilan bir xil mantiq (AsyncStorage'da saqlanadi). */
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find(i => i.productId === action.payload.productId);
      if (existing) existing.quantity += action.payload.quantity;
      else state.items.push(action.payload);
    },
    setQuantity(state, action: PayloadAction<{productId: string; quantity: number}>) {
      const item = state.items.find(i => i.productId === action.payload.productId);
      if (!item) return;
      item.quantity = action.payload.quantity;
      if (item.quantity <= 0) {
        state.items = state.items.filter(i => i.productId !== action.payload.productId);
      }
    },
    removeItem(state, action: PayloadAction<{productId: string}>) {
      state.items = state.items.filter(i => i.productId !== action.payload.productId);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const {addItem, setQuantity, removeItem, clearCart} = cartSlice.actions;
export default cartSlice.reducer;
