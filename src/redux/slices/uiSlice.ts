import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  themeMode: "light" | "dark";
  isFilterDrawerOpen: boolean;
}

const initialState: UiState = {
  themeMode: "light",
  isFilterDrawerOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleTheme(state) {
      state.themeMode = state.themeMode === "light" ? "dark" : "light";
    },
    setTheme(state, action: PayloadAction<"light" | "dark">) {
      state.themeMode = action.payload;
    },
    setFilterDrawerOpen(state, action: PayloadAction<boolean>) {
      state.isFilterDrawerOpen = action.payload;
    },
  },
});

export const { toggleTheme, setTheme, setFilterDrawerOpen } = uiSlice.actions;
export default uiSlice.reducer;
