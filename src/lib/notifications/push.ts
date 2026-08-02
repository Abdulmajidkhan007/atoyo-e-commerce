import "server-only";
import { getMessaging } from "firebase-admin/messaging";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { AppUser } from "@/types/user";

/**
 * PUSH BILDIRISHNOMALAR (Firebase Cloud Messaging).
 *
 * Ilova ishga tushganda qurilma tokenini `/api/profile/push-token` ga
 * yuboradi, token esa `users/{uid}.pushTokens` massivida saqlanadi.
 * Bir odamda bir nechta qurilma bo'lishi mumkin - shuning uchun massiv.
 *
 * Umumiy xabarlar (yangi mahsulot, chegirma) esa "topic" orqali:
 * ilova `products` mavzusiga obuna bo'ladi, server esa bitta so'rov
 * bilan hammaga yuboradi - token ro'yxatini aylanib chiqish shart emas.
 *
 * Hammasi BEST-EFFORT: FCM sozlanmagan yoki xato bo'lsa, asosiy amal
 * (buyurtma statusi, mahsulot e'loni) baribir davom etadi.
 */

/** Ilova obuna bo'ladigan umumiy mavzu. */
export const PRODUCTS_TOPIC = "products";

export interface PushMessage {
  title: string;
  body: string;
  /** Ilovada bosilganda ochiladigan joy: `{screen, productId, orderId}`. */
  data?: Record<string, string>;
}

/** Mijozning qurilmalariga bildirishnoma (tokeni yo'q bo'lsa - jim o'tadi). */
export async function sendPushToUser(userId: string, message: PushMessage): Promise<void> {
  try {
    const snap = await getAdminDb().collection("users").doc(userId).get();
    const tokens = ((snap.data() as AppUser | undefined)?.pushTokens ?? []).filter(Boolean);
    if (tokens.length === 0) return;

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: message.title, body: message.body },
      data: message.data,
      android: { priority: "high", notification: { channelId: "atoyo" } },
    });

    // Eskirgan tokenlar (ilova o'chirilgan/qayta o'rnatilgan) tozalanadi -
    // aks holda ro'yxat cheksiz o'sib, har safar xato qaytaradi.
    const dead = response.responses
      .map((result, index) => (result.success ? null : tokens[index]))
      .filter((token): token is string => token !== null);
    if (dead.length > 0) {
      await getAdminDb()
        .collection("users")
        .doc(userId)
        .update({ pushTokens: FieldValue.arrayRemove(...dead) });
    }
  } catch (error) {
    console.error("Push yuborishda xato:", error);
  }
}

/** Hamma obunachilarga (yangi mahsulot, chegirma). */
export async function sendPushToTopic(topic: string, message: PushMessage): Promise<void> {
  try {
    await getMessaging().send({
      topic,
      notification: { title: message.title, body: message.body },
      data: message.data,
      android: { priority: "high", notification: { channelId: "atoyo" } },
    });
  } catch (error) {
    console.error("Topic push yuborishda xato:", error);
  }
}

/** Qurilma tokenini saqlash (ilova har ishga tushganda yuboradi). */
export async function savePushToken(userId: string, token: string): Promise<void> {
  await getAdminDb()
    .collection("users")
    .doc(userId)
    .set({ pushTokens: FieldValue.arrayUnion(token) }, { merge: true });
}

/** Chiqishda yoki bildirishnoma o'chirilganda tokenni olib tashlash. */
export async function removePushToken(userId: string, token: string): Promise<void> {
  await getAdminDb()
    .collection("users")
    .doc(userId)
    .update({ pushTokens: FieldValue.arrayRemove(token) });
}
