import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { buildNameTokens } from "@/lib/search/tokens";
import { bumpProductCodeCounter } from "@/lib/products/product-code";
import type { Product } from "@/types/product";

export const runtime = "nodejs";

/**
 * Bir martalik to'ldirish (idempotent, faqat admin):
 *
 *   1) `nameTokens` - eski mahsulotlarda so'z bo'yicha qidiruv ishlashi uchun;
 *   2) `code` - MAHSULOT RAQAMI: eng eski mahsulotdan boshlab 1, 2, 3...
 *      Hujjat ID si o'zgarmaydi (unga buyurtmalar, kirim tarixi va rasm
 *      papkalari bog'langan) - raqam uning yoniga qo'shiladi va bundan
 *      keyin hamma joyda (guruh xabarlari, bot buyruqlari) shu ko'rinadi.
 *
 * Qayta bosilsa faqat yetishmayotganini to'ldiradi.
 */
export async function POST(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  /**
   * `renumber: true` - HAMMA raqam qaytadan beriladi (1, 2, 3...).
   * O'chirilgan mahsulotdan qolgan bo'sh raqamlar yopiladi, lekin
   * mavjud mahsulotlarning raqami o'zgaradi - guruhda avval yozilgan
   * "№12" boshqa mahsulotni ko'rsatib qolishi mumkin. Shuning uchun bu
   * alohida so'raladi.
   */
  const body = (await request.json().catch(() => ({}))) as { renumber?: boolean };
  const renumber = body.renumber === true;

  const db = getAdminDb();
  const snapshot = await db.collection("products").limit(500).get();

  // Raqamlar yaratilish tartibida beriladi: eng eski mahsulot - 1-raqam.
  const docs = [...snapshot.docs].sort(
    (a, b) => ((a.data() as Product).createdAt ?? 0) - ((b.data() as Product).createdAt ?? 0)
  );

  // Allaqachon berilgan raqamlar band hisoblanadi (qayta tartiblashda
  // esa hech biri band emas - hammasi yangidan beriladi).
  const taken = new Set<number>();
  if (!renumber) {
    for (const doc of docs) {
      const code = (doc.data() as Product).code;
      if (typeof code === "number" && code > 0) taken.add(code);
    }
  }

  let candidate = 1;
  const takeNextCode = () => {
    while (taken.has(candidate)) candidate += 1;
    taken.add(candidate);
    return candidate;
  };

  const batch = db.batch();
  let updated = 0;
  let codesAdded = 0;

  for (const doc of docs) {
    const p = doc.data() as Product;
    const updates: Record<string, unknown> = {};

    // Tokenlar HAR DOIM qayta hisoblanadi: qoida o'zgargan bo'lishi
    // mumkin (kirillcha->lotincha, kod/artikul qo'shilishi). Faqat
    // haqiqatan o'zgargan bo'lsa yoziladi.
    const tokens = buildNameTokens(p.name, p.brand, p.sku);
    const sameTokens =
      Array.isArray(p.nameTokens) &&
      p.nameTokens.length === tokens.length &&
      tokens.every((token, i) => p.nameTokens![i] === token);
    if (!sameTokens) updates.nameTokens = tokens;
    // Nom bo'yicha prefiks qidiruv maydoni ham to'g'ri bo'lsin.
    const searchIndex = p.name.trim().toLowerCase();
    if (p.nameSearchIndex !== searchIndex) updates.nameSearchIndex = searchIndex;
    if (renumber) {
      const next = takeNextCode();
      if (p.code !== next) {
        updates.code = next;
        codesAdded += 1;
      }
    } else if (typeof p.code !== "number" || p.code <= 0) {
      updates.code = takeNextCode();
      codesAdded += 1;
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      updated += 1;
    }
  }

  if (updated > 0) await batch.commit();
  // Hisoblagich mavjud eng katta raqamdan orqada qolmasin.
  const maxCode = taken.size > 0 ? Math.max(...taken) : 0;
  if (maxCode > 0) await bumpProductCodeCounter(maxCode);

  return NextResponse.json({ ok: true, scanned: snapshot.size, updated, codesAdded });
}
