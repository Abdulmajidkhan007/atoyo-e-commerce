import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { refreshChannelPost } from "@/lib/telegram/channel";
import { logAction } from "@/lib/telegram/action-log";
import type { Product } from "@/types/product";

export const runtime = "nodejs";

/** Bir so'rovda shuncha post yangilanadi (Telegram limitiga urilmaslik uchun). */
const BATCH = 40;

/**
 * KANALDAGI ESKI POSTLARNI YANGILASH.
 *
 * Sayt manzili o'zgarganda eski e'lonlardagi "Saytda ko'rish" havolasi
 * eski domenga qarab qoladi. Bu route kanalga chiqqan mahsulotlarni
 * aylanib chiqib, har birining postini JOYIDA tahrirlaydi - yangi post
 * tashlanmaydi, ya'ni obunachilarga takror xabar bormaydi.
 *
 * Postlar ko'p bo'lsa bir necha marta bosiladi: har safar yangilanmagan
 * (eski havolali) postlar navbatdan o'tadi.
 */
export async function POST() {
  const admin = await requirePermission("settings");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const snapshot = await getAdminDb()
    .collection("products")
    .where("channelMessageId", ">", 0)
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

  return NextResponse.json({ ok: true, scanned: snapshot.size, updated, unchanged, failed });
}
