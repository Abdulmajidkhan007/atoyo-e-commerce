import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppUser } from "@/types/user";

interface UserState {
  profile: AppUser | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
}

const initialState: UserState = { profile: null, status: "idle" };

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<AppUser | null>) {
      state.profile = action.payload;
      state.status = action.payload ? "authenticated" : "unauthenticated";
    },
    setAuthLoading(state) {
      state.status = "loading";
    },
    signOut(state) {
      state.profile = null;
      state.status = "unauthenticated";
    },
  },
});

export const { setProfile, setAuthLoading, signOut } = userSlice.actions;
export default userSlice.reducer;
