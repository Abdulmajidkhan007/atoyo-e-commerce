"use client";

import { useEffect } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { subscribeToAuthChanges } from "@/lib/firebase/auth";
import { useAppDispatch } from "@/redux/hooks";
import { setProfile, setAuthLoading, signOut } from "@/redux/slices/userSlice";
import type { AppUser } from "@/types/user";

/**
 * Ilova yuklanganda Firebase Auth holatini kuzatadi va foydalanuvchi
 * hujjatini (rol bilan birga) Firestore'dan real-vaqtda o'qib Redux'ga
 * yozadi. `onSnapshot` ishlatilishi sababi - admin panel orqali rol
 * o'zgartirilsa, foydalanuvchi sahifani yangilamasdan turib yangi
 * huquqlarni ko'radi.
 */
export function useAuthListener() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setAuthLoading());

    let unsubscribeUserDoc: (() => void) | undefined;

    const unsubscribeAuth = subscribeToAuthChanges((user) => {
      unsubscribeUserDoc?.();

      if (!user) {
        dispatch(signOut());
        return;
      }

      unsubscribeUserDoc = onSnapshot(doc(getFirebaseDb(), "users", user.uid), (snapshot) => {
        if (!snapshot.exists()) {
          dispatch(signOut());
          return;
        }
        const data = snapshot.data() as Omit<AppUser, "uid">;

        // Email tasdiqlash orqali almashtirilgan bo'lsa, Firestore'dagi
        // nusxasini Auth'dagi haqiqiy qiymatga moslaymiz (best-effort).
        if (user.email && data.email !== user.email) {
          updateDoc(snapshot.ref, { email: user.email }).catch(() => {});
        }

        dispatch(setProfile({ uid: user.uid, ...data, email: user.email ?? data.email }));
      });
    });

    return () => {
      unsubscribeUserDoc?.();
      unsubscribeAuth();
    };
  }, [dispatch]);
}
