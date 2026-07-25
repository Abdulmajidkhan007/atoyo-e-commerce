import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Sevimli mahsulot - ro'yxatda ko'rsatish uchun zarur minimal ma'lumot. */
export interface FavoriteItem {
  productId: string;
  name: string;
  price: number;
  thumbnailUrl: string;
}

interface FavoritesState {
  items: FavoriteItem[];
}

const initialState: FavoritesState = { items: [] };

/**
 * SEVIMLILAR (wishlist). Savat kabi localStorage'da saqlanadi
 * (redux-persist whitelist) - tizimga kirmagan mijoz ham foydalana oladi.
 */
const favoritesSlice = createSlice({
  name: "favorites",
  initialState,
  reducers: {
    toggleFavorite(state, action: PayloadAction<FavoriteItem>) {
      const index = state.items.findIndex((i) => i.productId === action.payload.productId);
      if (index >= 0) state.items.splice(index, 1);
      else state.items.push(action.payload);
    },
    removeFavorite(state, action: PayloadAction<{ productId: string }>) {
      state.items = state.items.filter((i) => i.productId !== action.payload.productId);
    },
    clearFavorites(state) {
      state.items = [];
    },
  },
});

export const { toggleFavorite, removeFavorite, clearFavorites } = favoritesSlice.actions;
export default favoritesSlice.reducer;
