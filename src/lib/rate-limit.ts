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

const IP_PATTERN = /^[0-9a-f:.]+$/i;

/**
 * So'rov manbasini (IP) aniqlaydi - proksi headeri orqali.
 *
 * Zanjir: mijoz -> Firebase Hosting -> Cloud Run (`firebase.json` dagi
 * `hosting.rewrites[0].run` - klassik BITTA Hosting-Cloud Run rewrite,
 * App Hosting backend'ni o'ziga xos ikkinchi proksi qatlami sifatida
 * QO'SHMAYDI). Google Front End bu zanjirning oxirgi bosqichida
 * `X-Forwarded-For` ga IKKITA qiymat qo'shadi: haqiqiy ulangan IP va
 * o'zining LB IP si (https://cloud.google.com/load-balancing/docs/https#x-forwarded-for_header).
 * Shuning uchun ro'yxatning BIRINCHISI EMAS olinadi (uni mijozning o'zi
 * `X-Forwarded-For: 1.2.3.4` deb yozib qo'yishi mumkin) va OXIRGISI HAM
 * EMAS (bu Google'ning o'z LB IP si - hamma so'rov uchun bir xil,
 * olinsa HAMMA foydalanuvchi bitta "IP" ga tushadi) - balki OXIRGIDAN
 * OLDINGI qiymat, chunki uni mijoz emas, Google Front End yozadi.
 *
 * Zanjir uzunligi o'zgarsa (masalan proksi qatlami qo'shilsa/olib
 * tashlansa) bu joy qayta tekshirilishi kerak - docs/AUDIT.md 2.3.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";

  const parts = forwarded
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "unknown";

  const candidate = parts.length >= 2 ? parts[parts.length - 2]! : parts[0]!;
  return IP_PATTERN.test(candidate) ? candidate : "unknown";
}
