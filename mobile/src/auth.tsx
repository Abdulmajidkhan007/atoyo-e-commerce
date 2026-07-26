import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import auth, {type FirebaseAuthTypes} from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export interface AppUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber?: string | null;
  homeAddress?: string | null;
}

interface AuthValue {
  user: AppUserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  saveProfile: (patch: {displayName?: string; phoneNumber?: string; homeAddress?: string}) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Auth holati - Firebase Auth + Firestore'dagi `users/{uid}` hujjati.
 * Sayt bilan bir xil kolleksiya, shuning uchun bitta hisob ikkala
 * platformada ham ishlaydi.
 */
export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribe = auth().onAuthStateChanged(async (fbUser: FirebaseAuthTypes.User | null) => {
      unsubscribeDoc?.();
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      unsubscribeDoc = firestore()
        .collection('users')
        .doc(fbUser.uid)
        .onSnapshot(
          snap => {
            const data = (snap.data() ?? {}) as Omit<AppUserProfile, 'uid'>;
            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: data.displayName ?? fbUser.displayName,
              phoneNumber: data.phoneNumber ?? null,
              homeAddress: data.homeAddress ?? null,
            });
            setLoading(false);
          },
          () => {
            setUser({uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName});
            setLoading(false);
          },
        );
    });

    return () => {
      unsubscribeDoc?.();
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      signIn: async (email, password) => {
        await auth().signInWithEmailAndPassword(email.trim(), password);
      },
      register: async (name, email, password) => {
        const credential = await auth().createUserWithEmailAndPassword(email.trim(), password);
        await credential.user.updateProfile({displayName: name});
        // Sayt bilan bir xil hujjat shakli - rol doim "user".
        await firestore().collection('users').doc(credential.user.uid).set(
          {
            email: email.trim(),
            displayName: name,
            role: 'user',
            createdAt: Date.now(),
          },
          {merge: true},
        );
      },
      signOut: async () => {
        await auth().signOut();
      },
      resetPassword: async email => {
        await auth().sendPasswordResetEmail(email.trim());
      },
      saveProfile: async patch => {
        const current = auth().currentUser;
        if (!current) return;
        await firestore().collection('users').doc(current.uid).set(patch, {merge: true});
        if (patch.displayName) await current.updateProfile({displayName: patch.displayName});
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak.');
  return context;
}
