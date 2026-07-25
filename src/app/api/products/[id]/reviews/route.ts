import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { Review } from "@/types/review";

export const runtime = "nodejs";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3).max(1000),
});

/** Mahsulot sharhlari (ochiq o'qish, eng yangisidan). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const snap = await getAdminDb()
      .collection("reviews")
      .where("productId", "==", id)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    return NextResponse.json({ reviews: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review) });
  } catch {
    // Kompozit indeks hali yaratilmagan bo'lsa - saralashsiz olib, xotirada tartiblaymiz.
    const snap = await getAdminDb().collection("reviews").where("productId", "==", id).limit(50).get();
    const reviews = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Review)
      .sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json({ reviews });
  }
}

/**
 * Sharh qoldirish - faqat tizimga kirgan foydalanuvchi va har mahsulotga
 * bir marta. Mahsulotning o'rtacha reytingi (ratingAvg/ratingCount)
 * darhol qayta hisoblanadi.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Sharh qoldirish uchun tizimga kiring." }, { status: 401 });

  const { allowed } = await checkRateLimit({
    key: `review:${getClientIp(request)}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Juda ko'p sharh yuborildi. Keyinroq urinib ko'ring." }, { status: 429 });
  }

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const { id: productId } = await params;
  const db = getAdminDb();
  // Bitta foydalanuvchi bitta mahsulotga bitta sharh - ID shundan tuziladi.
  const reviewRef = db.collection("reviews").doc(`${productId}_${user.uid}`);
  const productRef = db.collection("products").doc(productId);

  const review: Review = {
    id: reviewRef.id,
    productId,
    userId: user.uid,
    authorName: user.displayName ?? "Mijoz",
    rating: parsed.data.rating,
    comment: parsed.data.comment.trim(),
    createdAt: Date.now(),
  };

  try {
    await db.runTransaction(async (tx) => {
      const [existing, productSnap] = await Promise.all([tx.get(reviewRef), tx.get(productRef)]);
      if (!productSnap.exists) throw new Error("product-not-found");

      const data = productSnap.data() as { ratingSum?: number; ratingCount?: number };
      const prevRating = existing.exists ? (existing.data() as Review).rating : 0;
      const sumDelta = review.rating - prevRating;
      const countDelta = existing.exists ? 0 : 1;

      tx.set(reviewRef, review);
      const newSum = (data.ratingSum ?? 0) + sumDelta;
      const newCount = (data.ratingCount ?? 0) + countDelta;
      tx.update(productRef, {
        ratingSum: FieldValue.increment(sumDelta),
        ratingCount: FieldValue.increment(countDelta),
        ratingAvg: newCount > 0 ? Math.round((newSum / newCount) * 10) / 10 : 0,
      });
    });

    return NextResponse.json({ ok: true, review });
  } catch (error) {
    if (error instanceof Error && error.message === "product-not-found") {
      return NextResponse.json({ error: "Mahsulot topilmadi." }, { status: 404 });
    }
    console.error("Sharh saqlashda xato:", error);
    return NextResponse.json({ error: "Sharh saqlanmadi." }, { status: 500 });
  }
}
