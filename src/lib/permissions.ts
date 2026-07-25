/**
 * ROLLAR VA HUQUQLAR
 *
 *   owner  - loyiha egasi (OWNER_EMAIL). BARCHA huquqlarga ega, hech kim
 *            uni o'zgartira/o'chira olmaydi. Adminlarni tayinlaydi va
 *            har bir adminning huquqlarini alohida belgilaydi.
 *   admin  - faqat owner bergan huquqlar doirasida ishlaydi.
 *   user   - oddiy mijoz.
 *
 * Client ham, server ham ishlatadi - "server-only" YO'Q.
 */

/** Loyiha egasi. Bu email bilan kirgan foydalanuvchi doim owner bo'ladi. */
export const OWNER_EMAIL = "santexnika.atoyo@gmail.com";

export const PERMISSION_KEYS = [
  "products", // mahsulot qo'shish/tahrirlash/o'chirish, kirim
  "blog", // maqola qo'shish/tahrirlash/o'chirish
  "orders", // buyurtma holatini o'zgartirish
  "broadcast", // foydalanuvchilarga e'lon yuborish
  "settings", // sayt va bot sozlamalari
  "users", // foydalanuvchilar ro'yxatini ko'rish
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type AdminPermissions = Partial<Record<PermissionKey, boolean>>;

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  products: "Mahsulotlar (qo'shish, tahrirlash, kirim)",
  blog: "Blog (maqolalar)",
  orders: "Buyurtmalar (holatni o'zgartirish)",
  broadcast: "Xabar yuborish (e'lonlar)",
  settings: "Sozlamalar (sayt va bot)",
  users: "Foydalanuvchilar ro'yxati",
};

/** Yangi admin tayinlanganda beriladigan standart huquqlar. */
export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  products: true,
  blog: true,
  orders: true,
  broadcast: false,
  settings: false,
  users: false,
};

interface RoleHolder {
  email?: string | null;
  role?: string;
  permissions?: AdminPermissions;
}

/** Foydalanuvchi loyiha egasimi (email yoki role bo'yicha). */
export function isOwner(user: RoleHolder | null | undefined): boolean {
  if (!user) return false;
  return user.role === "owner" || user.email?.toLowerCase() === OWNER_EMAIL;
}

/** Admin panelga umuman kira oladimi (owner yoki admin). */
export function isStaff(user: RoleHolder | null | undefined): boolean {
  return isOwner(user) || user?.role === "admin";
}

/**
 * Aniq huquq bormi. Owner uchun har doim true; admin uchun owner bergan
 * ruxsatga qaraydi (belgilanmagan bo'lsa - standart huquqlar).
 */
export function hasPermission(user: RoleHolder | null | undefined, key: PermissionKey): boolean {
  if (isOwner(user)) return true;
  if (user?.role !== "admin") return false;
  const perms = user.permissions ?? DEFAULT_ADMIN_PERMISSIONS;
  return perms[key] === true;
}
