"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, IconButton, TextField } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { useAppSelector } from "@/redux/hooks";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { ensureSessionCookie } from "@/lib/firebase/auth";
import { StarRating } from "./StarRating";
import type { Review } from "@/types/review";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Mahsulot sharhlari: ro'yxat + tizimga kirgan mijoz uchun forma.
 * Har bir foydalanuvchi bitta sharh qoldiradi (qayta yuborsa - yangilanadi).
 */
export function ProductReviews({ productId }: { productId: string }) {
  const { dict } = useI18n();
  const profile = useAppSelector((s) => s.user.profile);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchReviews = useCallback(async (): Promise<Review[]> => {
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, { cache: "no-store" });
      const data = (await res.json()) as { reviews?: Review[] };
      return data.reviews ?? [];
    } catch {
      return [];
    }
  }, [productId]);

  useEffect(() => {
    let active = true;
    fetchReviews().then((list) => {
      if (active) setReviews(list);
    });
    return () => {
      active = false;
    };
  }, [fetchReviews]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (comment.trim().length < 3) return;

    setSaving(true);
    setMessage(null);
    try {
      // Sessiya cookie'si eskirgan bo'lishi mumkin - avval yangilaymiz.
      await ensureSessionCookie();
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "error");

      setComment("");
      setMessage({ type: "success", text: dict.reviews.thanks });
      setReviews(await fetchReviews());
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Xatolik" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-10 border-t border-navy-100 pt-8 dark:border-navy-500">
      <h2 className="mb-4 text-xl font-bold text-navy-900 dark:text-white">
        {dict.reviews.title} {reviews.length > 0 && <span className="text-navy-300">({reviews.length})</span>}
      </h2>

      {reviews.length === 0 ? (
        <p className="text-sm text-navy-300">{dict.reviews.none}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-navy-900 dark:text-white">{review.authorName}</span>
                <span className="text-xs text-navy-300">{formatDate(review.createdAt)}</span>
              </div>
              <StarRating value={review.rating} />
              <p className="mt-1 whitespace-pre-line text-sm text-navy-500 dark:text-navy-100">{review.comment}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        {!profile ? (
          <p className="text-sm text-navy-300">
            <Link href="/kirish" className="text-aqua-600 hover:underline">
              {dict.reviews.loginToReview}
            </Link>
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <h3 className="font-semibold text-navy-900 dark:text-white">{dict.reviews.write}</h3>

            <div className="flex items-center gap-1">
              <span className="mr-2 text-sm text-navy-300">{dict.reviews.yourRating}:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <IconButton
                  key={star}
                  size="small"
                  aria-label={`${star} yulduz`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                >
                  {(hover || rating) >= star ? (
                    <StarIcon fontSize="small" className="text-amber-400" />
                  ) : (
                    <StarBorderIcon fontSize="small" className="text-navy-200" />
                  )}
                </IconButton>
              ))}
            </div>

            <TextField
              label={dict.reviews.comment}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              minRows={3}
              required
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />

            {message && <Alert severity={message.type}>{message.text}</Alert>}

            <Button type="submit" variant="contained" disabled={saving} className="!w-fit">
              {dict.reviews.submit}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
