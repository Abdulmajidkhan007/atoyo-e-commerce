import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * ODDIY RATE LIMIT (spamdan himoya). Har bir kalit (masalan
 * "contact:<IP>") uchun berilgan oyna ichida nechta so'rov bo'lganini
 * `rateLimits` kolleksiyasida sanaydi.
 *
 * Nega Firestore: server serversiz (Cloud Run) muhitda ishlaydi va
 * har konteyner qayta ko'tarilganda xotira tozalanadi - shuning uchun
 * xotiradagi hisoblagich ishonchsiz. Yozuvlar TTL bilan o'z-o'zidan
 * eskiradi (Firestore konsolida `expiresAt` uchun TTL siyosatini
 * yoqish tavsiya etiladi).
 */
export async function checkRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ allowed: boolean; remaining: number }> {
  const { key, limit, windowMs } = params;
  const now = Date.now();

  try {
    // MUHIM: `getAdminDb()` ham SHU try ichida. Avval u tashqarida
    // turardi va Admin SDK sozlanmagan bo'lsa (lokal ishlab chiqish)
    // funksiya "fail-open" o'rniga xato tashlab, chaqirgan route'ni
    // 500 qilib qo'yardi.
    const db = getAdminDb();
    const ref = db.collection("rateLimits").doc(key.replace(/[^a-zA-Z0-9:._-]/g, "_"));

    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() as { count?: number; windowStart?: number } | undefined;

      // Oyna tugagan (yoki birinchi so'rov) - hisoblagich noldan boshlanadi.
      if (!data?.windowStart || now - data.windowStart > windowMs) {
        tx.set(ref, {
          count: 1,
          windowStart: now,
          expiresAt: new Date(now + windowMs * 2),
        });
        return { allowed: true, remaining: limit - 1 };
      }

      const count = data.count ?? 0;
      if (count >= limit) return { allowed: false, remaining: 0 };

      tx.update(ref, { count: FieldValue.increment(1) });
      return { allowed: true, remaining: limit - count - 1 };
    });
  } catch (error) {
    // Limit tekshiruvi ishlamasa - so'rovni bloklamaymiz (fail-open),
    // aks holda baza muammosi butun formani ishdan chiqarardi.
    console.error("Rate limit tekshiruvida xato:", error);
    return { allowed: true, remaining: limit };
  }
}

/** So'rov manbasini (IP) aniqlaydi - proksi headeri orqali. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
