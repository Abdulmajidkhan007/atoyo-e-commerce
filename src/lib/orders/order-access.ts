import "server-only";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { verifyOrderAccessToken } from "./access-token";
import type { Order } from "@/types/order";

/**
 * Buyurtma sahifasi / chek yuklash — kim kira oladi:
 *   • havoladagi kalit (`?t=`) to'g'ri bo'lsa (mehmon ham);
 *   • yoki tizimga kirgan mijozning O'Z buyurtmasi.
 * Boshqa hollarda chaqiruvchi 404 qaytaradi — buyurtma borligi ham
 * bilinmasin.
 */
export async function canAccessOrder(
  order: Pick<Order, "userId" | "accessTokenHash">,
  token: string | null | undefined,
  request?: Request
): Promise<boolean> {
  if (verifyOrderAccessToken(token, order.accessTokenHash)) return true;
  if (!order.userId || !request) return false;
  const user = await getAppUserFromRequest(request).catch(() => null);
  return user?.uid === order.userId;
}
