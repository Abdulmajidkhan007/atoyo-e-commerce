import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ProductFilterParams } from "@/types/product";

interface FilterState extends ProductFilterParams {
  searchTerm: string;
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
    resetFilters() {
      return initialState;
    },
  },
});

export const { setFilters, resetFilters } = filterSlice.actions;
export default filterSlice.reducer;
