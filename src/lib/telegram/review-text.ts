import { escapeHtml } from "./html";

export interface ReviewLineInput {
  rating: number;
  authorName: string;
  comment: string;
}

/** Bitta sharhning HTML qatori: yulduzlar + muallif (qalin) + matn. */
export function buildReviewLine(review: ReviewLineInput): string {
  return `${"⭐️".repeat(review.rating)}\n<b>${escapeHtml(review.authorName)}</b>: ${escapeHtml(review.comment)}`;
}
