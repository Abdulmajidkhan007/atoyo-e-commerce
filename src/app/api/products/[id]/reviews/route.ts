import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { listReviews, saveReview, ReviewError } from "@/lib/reviews/save-review";

export const runtime = "nodejs";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3).max(1000),
});

/** Mahsulot sharhlari (ochiq o'qish, eng yangisidan). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ reviews: await listReviews(id) });
}

/**
 * Sharh qoldirish - faqat tizimga kirgan foydalanuvchi va har mahsulotga
 * bir marta. Saqlash mantig'i Telegram bot bilan umumiy
 * (lib/reviews/save-review), shunda reyting hisobi bir joyda turadi.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAppUserFromRequest(request);
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

  try {
    const review = await saveReview({
      productId,
      userKey: user.uid,
      authorName: user.displayName ?? "Mijoz",
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });
    return NextResponse.json({ ok: true, review });
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: "Mahsulot topilmadi." }, { status: 404 });
    }
    console.error("Sharh saqlashda xato:", error);
    return NextResponse.json({ error: "Sharh saqlanmadi." }, { status: 500 });
  }
}
