import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { buildNameTokens } from "@/lib/search/tokens";
import { bumpProductCodeCounter, setProductCodeCounter } from "@/lib/products/product-code";
import type { Product } from "@/types/product";

export const runtime = "nodejs";

/** Bir so'rovda o'qiladigan hujjatlar soni. */
const PAGE = 400;
/** Xotira uchun yuqori chegara (10 000+ katalog uchun yetarli). */
const MAX_DOCS = 20_000;
/** Firestore batch chegarasi 500 ta - xavfsiz oraliq. */
const BATCH_LIMIT = 400;

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

  /**
   * HAMMA mahsulot ko'rib chiqiladi.
   *
   * Ilgari bu yerda `limit(500)` turardi va katalogda 500 tadan ko'p
   * mahsulot bo'lsa qolganlari JIMGINA tashlab ketilardi - raqami
   * yo'q mahsulot raqamsiz qolaverar edi. Endi kursor (`__name__`)
   * bilan sahifama-sahifa o'qiladi (kompozit indeks kerak emas).
   */
  const docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection("products").orderBy("__name__").limit(PAGE);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    docs.push(...page.docs);
    if (page.size < PAGE) break;
    cursor = page.docs[page.size - 1];
    if (docs.length >= MAX_DOCS) break;
  }

  // Raqamlar yaratilish tartibida beriladi: eng eski mahsulot - 1-raqam.
  docs.sort((a, b) => ((a.data() as Product).createdAt ?? 0) - ((b.data() as Product).createdAt ?? 0));

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

  // Yozuvlar bo'lib-bo'lib yuboriladi: bitta batch'ga 500 tadan ko'p
  // amal sig'maydi.
  let batch = db.batch();
  let pending = 0;
  let updated = 0;
  let codesAdded = 0;

  for (const doc of docs) {
    const p = doc.data() as Product;
    const updates: Record<string, unknown> = {};

    // Tokenlar HAR DOIM qayta hisoblanadi: qoida o'zgargan bo'lishi
    // mumkin (kirillcha->lotincha, kod/artikul qo'shilishi). Faqat
    // haqiqatan o'zgargan bo'lsa yoziladi.
    const tokens = buildNameTokens(p.name, p.brand, p.sku, p.keywords);
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
      pending += 1;
      if (pending >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }
  }

  if (pending > 0) await batch.commit();

  const maxCode = taken.size > 0 ? Math.max(...taken) : 0;
  if (renumber) {
    /**
     * QAYTA TARTIBLASHDA hisoblagich ANIQ shu raqamga QO'YILADI
     * (kamayishi ham mumkin).
     *
     * Ilgari bu yerda ham `bumpProductCodeCounter` chaqirilardi - u
     * esa faqat ko'taradi. Natijada 3 900 ta mahsulot o'chirilib,
     * qolgani 1..87 ga qayta raqamlangandan keyin ham hisoblagich
     * 3945 da qolib ketardi va keyingi mahsulot 3946-raqamni olardi.
     */
    await setProductCodeCounter(maxCode);
  } else if (maxCode > 0) {
    // Faqat to'ldirishda: hisoblagich eng katta raqamdan orqada qolmasin.
    await bumpProductCodeCounter(maxCode);
  }

  return NextResponse.json({
    ok: true,
    scanned: docs.length,
    updated,
    codesAdded,
    nextCode: maxCode + 1,
  });
}
