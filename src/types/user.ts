import type { AdminPermissions } from "@/lib/permissions";

export type UserRole = "user" | "admin" | "owner";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  /** Admin uchun owner bergan huquqlar (owner uchun ahamiyatsiz - hammasi ochiq). */
  permissions?: AdminPermissions;
  phoneNumber?: string | null;
  /** Uy/yetkazish manzili (profil sozlamalaridan). */
  homeAddress?: string | null;
  createdAt: number;
}
