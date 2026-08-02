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
  /** Telegram orqali kirgan bo'lsa - Telegram foydalanuvchi ID va useri. */
  telegramId?: number;
  telegramUsername?: string;
  /**
   * Mobil ilova qurilmalarining FCM tokenlari (push bildirishnoma uchun).
   * Bir odamda bir nechta qurilma bo'lishi mumkin.
   */
  pushTokens?: string[];
  createdAt: number;
}
