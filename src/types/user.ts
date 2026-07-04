export type UserRole = "user" | "admin";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  phoneNumber?: string | null;
  /** Uy/yetkazish manzili (profil sozlamalaridan). */
  homeAddress?: string | null;
  createdAt: number;
}
