import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";
import { moveToTrash, TRASH_DAYS } from "@/lib/products/trash";
import { announceProduct } from "@/lib/telegram/channel";
import { buildNameTokens } from "@/lib/search/tokens";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import type { Product } from "@/types/product";

export const runtime = "nodejs";

/**
 * TANLANGAN MAHSULOTLAR USTIDA OMMAVIY AMAL.
 *
 * Katta importdan keyin katalogni tozalash uchun: keraksizini o'chirish,
 * kategoriya/brendi xato tushganini to'g'rilash, sotuvdan olish/qaytarish
 * va tanlanganlarni kanalga e'lon qilish. Har bir amal xodimlar
 * guruhidagi "actions" topikka yoziladi.
 *
 * Kanalga e'lon SEKIN ketadi (Telegram chegarasi) - shuning uchun bir
 * so'rovda 10 tadan ko'p e'lon qilinmaydi, panel qolganini davom ettiradi.
 */
const MAX_IDS = 200;
const MAX_ANNOUNCE = 10;
/** Telegram kanaliga ketma-ket post orasidagi tanaffus. */
const ANNOUNCE_DELAY_MS = 1200;

const schema = z.union([
  z.object({ action: z.literal("delete"), ids: z.array(z.string().min(1)).min(1).max(MAX_IDS) }),
  z.object({
    action: z.literal("update"),
    ids: z.array(z.string().min(1)).min(1).max(MAX_IDS),
    patch: z.object({
      category: z.string().max(60).optional(),
      brand: z.string().max(80).optional(),
      manufacturerCountry: z.string().max(80).optional(),
      supplier: z.string().max(120).optional(),
      material: z.string().max(60).optional(),
      isActive: z.boolean().optional(),
    }),
  }),
  /**
   * RASMSIZLARNI SAYTDAN YASHIRISH.
   *
   * Katta import (1C narxnomasi) rasmsiz mahsulotlarni olib keladi -
   * ular katalogda "Rasm yo'q" bo'lib turadi va sayt ko'rimsiz
   * bo'ladi. Bu amal butun katalog bo'ylab yuradi, shuning uchun
   * SAHIFALAB ishlaydi: har chaqiruvda bir bo'lak, keyingisi uchun
   * kursor qaytadi.
   */
  z.object({
    action: z.literal("hide-imageless"),
    after: z.string().max(80).optional(),
  }),
  z.object({
    action: z.literal("announce"),
    ids: z.array(z.string().min(1)).min(1).max(MAX_ANNOUNCE),
    /**
     * `true` bo'lsa allaqachon kanalda turgan mahsulotning ESKI POSTI
     * o'chirilib, yangisi tashlanadi. Standart holatda (false) eski
     * post joyida tahrirlanadi - kanal takror e'lonlar bilan
     * to'lib ketmasligi uchun.
     */
    repost: z.boolean().optional(),
  }),
]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  const admin = await requirePermission("products", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "So'rov noto'g'ri." }, { status: 400 });

  const db = getAdminDb();
  const who = admin.email ?? admin.displayName ?? "admin";

  /* ------------- RASMSIZLARNI YASHIRISH -------------
     Bu amal ro'yxat bilan emas, BUTUN katalog bo'ylab ishlaydi -
     shuning uchun `ids` dan oldin turadi. */
  if (parsed.data.action === "hide-imageless") {
    return hideImageless(db, parsed.data.after, who);
  }

  const refs = parsed.data.ids.map((id) => db.collection("products").doc(id));

  /* ---------------- O'CHIRISH ---------------- */
  if (parsed.data.action === "delete") {
    const snaps = await db.getAll(...refs);
    const names = snaps
      .map((snap) => (snap.data() as Product | undefined)?.name)
      .filter(Boolean)
      .slice(0, 5);

    // BUTUNLAY o'chirilmaydi - 30 kunlik savatga ko'chiriladi.
    // Ilgari bir bosishda 200 ta mahsulot qaytarib bo'lmas darajada
    // yo'q bo'lardi (rasmlari bilan birga).
    const deleted = await moveToTrash(parsed.data.ids, who);

    await logAction(
      `🗑 Ommaviy o'chirish (${who}): ${deleted} ta mahsulot savatga tushdi` +
        (names.length > 0 ? ` — ${names.join(", ")}${deleted > names.length ? "..." : ""}` : "")
    );
    return NextResponse.json({
      ok: true,
      deleted,
      note: `${TRASH_DAYS} kun ichida «Katalog → O'chirilganlar» dan tiklash mumkin.`,
    });
  }

  /* ---------------- TAHRIRLASH ---------------- */
  if (parsed.data.action === "update") {
    const patch = parsed.data.patch;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "O'zgartirish ko'rsatilmagan." }, { status: 400 });
    }

    // Kategoriya/material ro'yxatdagi qiymat ekanini tekshiramiz.
    const taxonomy = await getTaxonomy();
    if (patch.category && !taxonomy.categories.some((item) => item.slug === patch.category)) {
      return NextResponse.json({ error: "Bunday kategoriya yo'q." }, { status: 400 });
    }
    if (patch.material && !taxonomy.materials.some((item) => item.slug === patch.material)) {
      return NextResponse.json({ error: "Bunday material yo'q." }, { status: 400 });
    }

    const snaps = await db.getAll(...refs);
    const batch = db.batch();
    const now = Date.now();

    snaps.forEach((snap, index) => {
      if (!snap.exists) return;
      const product = snap.data() as Product;
      const updates: Record<string, unknown> = { ...patch, updatedAt: now };
      // Brend qidiruv tokenlarida ham qatnashadi - qayta yig'iladi.
      if (patch.brand !== undefined) {
        updates.nameTokens = buildNameTokens(product.name, patch.brand, product.sku, product.keywords, [
          product.nameRu,
          product.nameEn,
          ...(product.variants ?? []).map((variant) => variant.sku),
        ]);
      }
      batch.update(refs[index]!, updates);
    });

    await batch.commit();

    const fields = Object.entries(patch)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ");
    await logAction(`✏️ Ommaviy tahrir (${who}): ${refs.length} ta mahsulot — ${fields}`);
    return NextResponse.json({ ok: true, updated: refs.length });
  }

  /* ---------------- KANALGA E'LON ---------------- */
  //
  // MUHIM: allaqachon kanalda turgan mahsulot uchun YANGI post
  // tashlanmaydi - eski post joyida tahrirlanadi (kanal takrorlar
  // bilan to'lib ketmasligi uchun). Shuning uchun natija ajratib
  // qaytariladi: nechtasi YANGI post bo'ldi, nechtasi yangilandi.
  // Haqiqatan yangi post kerak bo'lsa - `repost: true`.
  const repost = parsed.data.repost === true;
  const snaps = await db.getAll(...refs);
  let posted = 0;
  let edited = 0;
  let unchanged = 0;
  const skipped: string[] = [];

  for (const snap of snaps) {
    if (!snap.exists) continue;
    const product = { id: snap.id, ...snap.data() } as Product;

    // Rasmsiz mahsulot kanalda chiroyli chiqmaydi - o'tkazib yuboriladi.
    if ((product.images ?? []).length === 0) {
      skipped.push(`${product.name} (rasmi yo'q)`);
      continue;
    }
    if (product.isActive === false || product.isDraft) {
      skipped.push(`${product.name} (sotuvda emas)`);
      continue;
    }

    try {
      const mode = repost ? "repost" : product.channelMessageId ? "refresh" : "new";
      const result = await announceProduct(product, mode);
      if (result === "posted") posted += 1;
      else if (result === "edited") edited += 1;
      else if (result === "unchanged") unchanged += 1;
      else skipped.push(`${product.name} (e'lon qilinmadi)`);
    } catch (error) {
      console.error("Kanalga e'lon xatosi:", error);
      skipped.push(`${product.name} (Telegram xatosi)`);
    }
    await sleep(ANNOUNCE_DELAY_MS);
  }

  if (posted > 0 || edited > 0) {
    await logAction(
      `📢 Kanalga e'lon (${who}): ${posted} ta yangi post` +
        (edited > 0 ? `, ${edited} ta eski post yangilandi` : "")
    );
  }
  return NextResponse.json({ ok: true, posted, edited, unchanged, skipped });
}

/**
 * Rasmsiz mahsulotlarni saytdan yashiradi (bir bo'lak).
 * Katalog katta bo'lgani uchun sahifalab ishlaydi.
 */
async function hideImageless(
  db: FirebaseFirestore.Firestore,
  after: string | undefined,
  who: string
): Promise<NextResponse> {
  const SCAN = 400;
  let query: FirebaseFirestore.Query = db
    .collection("products")
    .select("images", "isActive")
    .orderBy("__name__")
    .limit(SCAN);
  if (after) query = query.startAfter(db.collection("products").doc(after));

  const snapshot = await query.get();
  const batch = db.batch();
  let hidden = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() as { images?: string[]; isActive?: boolean };
    const hasImage = (data.images ?? []).some(Boolean);
    if (hasImage || data.isActive === false) continue;
    batch.update(doc.ref, { isActive: false, updatedAt: Date.now() });
    hidden += 1;
  }
  if (hidden > 0) await batch.commit();

  const nextCursor = snapshot.docs.length === SCAN ? (snapshot.docs.at(-1)?.id ?? null) : null;
  if (hidden > 0) await logAction(`🙈 Rasmsiz mahsulotlar yashirildi (${who}): ${hidden} ta`);

  return NextResponse.json({ ok: true, scanned: snapshot.docs.length, hidden, nextCursor });
}
