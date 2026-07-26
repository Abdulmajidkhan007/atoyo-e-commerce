import AsyncStorage from '@react-native-async-storage/async-storage';
import {combineReducers, configureStore} from '@reduxjs/toolkit';
import {persistReducer, persistStore, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER} from 'redux-persist';
import {useDispatch, useSelector} from 'react-redux';
import cartReducer from './cartSlice';
import favoritesReducer from './favoritesSlice';

const rootReducer = combineReducers({
  cart: cartReducer,
  favorites: favoritesReducer,
});

// Savat va sevimlilar telefon xotirasida saqlanadi - ilova yopilib
// ochilganda ham joyida turadi (saytdagi redux-persist bilan bir xil g'oya).
const persistedReducer = persistReducer(
  {key: 'atoyo', storage: AsyncStorage, whitelist: ['cart', 'favorites']},
  rootReducer,
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]},
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
