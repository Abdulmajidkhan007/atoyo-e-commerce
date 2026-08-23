import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import cartReducer from "./slices/cartSlice";
import favoritesReducer from "./slices/favoritesSlice";
import userReducer from "./slices/userSlice";
import filterReducer from "./slices/filterSlice";
import uiReducer from "./slices/uiSlice";

const rootReducer = combineReducers({
  cart: cartReducer,
  favorites: favoritesReducer,
  user: userReducer,
  filters: filterReducer,
  ui: uiReducer,
});

// Savat, sevimlilar va UI (tema) localStorage'da saqlanadi.
// Foydalanuvchi/filtr holati har safar server bilan qayta sinxronlanadi.
const persistConfig = {
  key: "atoyo-root",
  storage,
  whitelist: ["cart", "ui", "favorites"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const makeStore = () =>
  configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
  });

export const store = makeStore();
const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
