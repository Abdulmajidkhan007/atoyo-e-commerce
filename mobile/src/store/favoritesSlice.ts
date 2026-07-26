import {createSlice, type PayloadAction} from '@reduxjs/toolkit';

interface FavoritesState {
  ids: string[];
}

const initialState: FavoritesState = {ids: []};

/** Sevimlilar - faqat ID ro'yxati, mahsulot ma'lumoti Firestore'dan olinadi. */
const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    toggleFavorite(state, action: PayloadAction<string>) {
      const index = state.ids.indexOf(action.payload);
      if (index >= 0) state.ids.splice(index, 1);
      else state.ids.push(action.payload);
    },
    clearFavorites(state) {
      state.ids = [];
    },
  },
});

export const {toggleFavorite, clearFavorites} = favoritesSlice.actions;
export default favoritesSlice.reducer;
