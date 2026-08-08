import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { refreshChannelPost } from "@/lib/telegram/channel";
import { logAction } from "@/lib/telegram/action-log";
import { getTelegramSecrets } from "@/lib/telegram/secrets";
import type { Product } from "@/types/product";

export const runtime = "nodejs";

/** Bir so'rovda shuncha post yangilanadi (Telegram limitiga urilmaslik uchun). */
const BATCH = 40;

/**
 * KANALDAGI POSTLARNI MAHSULOT MA'LUMOTIGA MOSLASH.
 *
 * Post matni HAR SAFAR mahsulotning HOZIRGI holatidan qayta quriladi
 * (nom, narx, tavsif, zaxira, turlar, "Saytda ko'rish" havolasi).
 * Ya'ni bu tugma faqat havolani emas - o'zgargan HAR QANDAY
 * ma'lumotni kanalga yetkazadi. Masalan optom narx dona narxga
 * o'girilganda eski postlarda eski raqam qolib ketgan edi.
 *
 * Post JOYIDA tahrirlanadi: yangi post tashlanmaydi, obunachilarga
 * takror xabar bormaydi. Matn o'zgarmagan bo'lsa Telegram uni rad
 * etadi va `unchanged` deb sanaladi (bu xato emas).
 *
 * Katalog katta bo'lishi mumkin, shuning uchun bir so'rovda 40 tasi
 * yangilanadi va `nextCursor` qaytariladi - admin paneli qolganini
 * shu kursor bilan davom ettiradi.
 */
export async function POST(request: Request) {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  // Bot tokeni bo'lmasa hamma chaqiruv yiqiladi - sababini aniq aytamiz
  // ("Telegram ruxsat bermadi" degan chalg'ituvchi xabar chiqmasin).
  const { botToken } = await getTelegramSecrets();
  if (!botToken) {
    return NextResponse.json(
      { error: "Bot tokeni (TELEGRAM_BOT_TOKEN) sozlanmagan — hosting sozlamalariga qo'shing." },
      { status: 400 }
    );
  }

  // Kursor - oxirgi ko'rilgan hujjatning ID si. Busiz har bosishda
  // AYNAN O'SHA 40 ta hujjat qayta ko'rilardi va qolganiga navbat
  // hech qachon yetmasdi.
  const after = new URL(request.url).searchParams.get("after");
  const collection = getAdminDb().collection("products");

  // Tengsizlik filtri bo'lgani uchun birinchi saralash SHU maydon
  // bo'yicha bo'lishi shart (Firestore qoidasi).
  let query = collection.where("channelMessageId", ">", 0).orderBy("channelMessageId");
  if (after) {
    const cursorDoc = await collection.doc(after).get().catch(() => null);
    if (cursorDoc?.exists) query = query.startAfter(cursorDoc);
  }

  const snapshot = await query
    .limit(BATCH)
    .get()
    .catch(() => null);

  if (!snapshot) {
    return NextResponse.json(
      { error: "Mahsulotlarni o'qib bo'lmadi (indeks kerak bo'lishi mumkin)." },
      { status: 500 }
    );
  }

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const doc of snapshot.docs) {
    const product = { id: doc.id, ...doc.data() } as Product;
    const result = await refreshChannelPost(product);
    if (result === "updated") updated += 1;
    else if (result === "unchanged") unchanged += 1;
    else if (result === "failed") failed += 1;
    // Telegram sekunddagi so'rovlar sonini cheklaydi - ozgina kutamiz.
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  if (updated > 0) {
    await logAction(`🔗 Kanal postlari yangilandi (${admin.email ?? "admin"}): ${updated} ta`);
  }

  // To'liq sahifa kelgan bo'lsa - yana bor, kursor beriladi.
  const nextCursor =
    snapshot.size === BATCH ? (snapshot.docs.at(-1)?.id ?? null) : null;

  return NextResponse.json({
    ok: true,
    scanned: snapshot.size,
    updated,
    unchanged,
    failed,
    nextCursor,
  });
}
