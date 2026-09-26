import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ProductFilterParams } from "@/types/product";

interface FilterState extends ProductFilterParams {
  searchTerm: string;
  /**
   * Qaysi katalog manzili (`?category=...`) filtrga allaqachon
   * ko'chirilgan (`CatalogContent`). Manzil bir marta ko'chiriladi —
   * keyin mijoz filtr oynasida boshqasini tanlasa, manzil uni
   * qaytarib bosib qo'ymaydi.
   */
  urlSyncedFor?: string;
}

const initialState: FilterState = {
  searchTerm: "",
  sortBy: "newest",
};

const filterSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<FilterState>>) {
      return { ...state, ...action.payload };
    },
    resetFilters(state) {
      // "Tozalash" manzildagi filtrni QAYTA yoqib yubormasin.
      return { ...initialState, urlSyncedFor: state.urlSyncedFor };
    },
  },
});

export const { setFilters, resetFilters } = filterSlice.actions;
export default filterSlice.reducer;
