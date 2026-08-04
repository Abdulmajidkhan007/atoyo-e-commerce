import type { AdminPermissions } from "@/lib/permissions";

/**
 * ROLLAR.
 *
 * `client` - OPTOM mijoz (viloyatdagi do'kon). U optom narxni ko'radi;
 * oddiy `user` esa dona narxni. Bu rol qo'lda emas, `/optom` sahifasida
 * maxfiy kalit kiritilganda beriladi (`wholesaleClients` ro'yxati).
 */
export type UserRole = "user" | "client" | "admin" | "owner";

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
  /** Optom mijoz bo'lsa - `wholesaleClients` dagi yozuv id'si. */
  wholesaleClientId?: string;
  /**
   * Mobil ilova qurilmalarining FCM tokenlari (push bildirishnoma uchun).
   * Bir odamda bir nechta qurilma bo'lishi mumkin.
   */
  pushTokens?: string[];
  createdAt: number;
}
