import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Review } from "@/types/review";

export class ReviewError extends Error {}

/**
 * SHARHNI SAQLASH - sayt (/api/products/[id]/reviews) ham, Telegram bot
 * ham shu funksiyani chaqiradi. Bitta foydalanuvchi bitta mahsulotga
 * bitta sharh qoldiradi (qayta yuborsa - yangilanadi), mahsulotning
 * o'rtacha reytingi o'sha tranzaksiyada qayta hisoblanadi.
 *
 * `userKey` - sayt uchun Firebase uid, bot uchun `tg:<telegramUserId>`.
 */
export async function saveReview(params: {
  productId: string;
  userKey: string;
  authorName: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  const db = getAdminDb();
  const reviewRef = db.collection("reviews").doc(`${params.productId}_${params.userKey}`);
  const productRef = db.collection("products").doc(params.productId);

  const review: Review = {
    id: reviewRef.id,
    productId: params.productId,
    userId: params.userKey,
    authorName: params.authorName,
    rating: params.rating,
    comment: params.comment.trim(),
    createdAt: Date.now(),
  };

  await db.runTransaction(async (tx) => {
    const [existing, productSnap] = await Promise.all([tx.get(reviewRef), tx.get(productRef)]);
    if (!productSnap.exists) throw new ReviewError("product-not-found");

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

  return review;
}

/** Mahsulotning oxirgi sharhlari (indeks bo'lmasa - xotirada saralanadi). */
export async function listReviews(productId: string, limit = 50): Promise<Review[]> {
  try {
    const snap = await getAdminDb()
      .collection("reviews")
      .where("productId", "==", productId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review);
  } catch {
    const snap = await getAdminDb().collection("reviews").where("productId", "==", productId).limit(limit).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Review)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}
