import Link from "next/link";
import type { Testimonial } from "@/lib/reviews/testimonial-view";
import { localeHref } from "@/lib/i18n/href";
import type { Locale } from "@/lib/i18n/config";

/**
 * "MIJOZLAR FIKRI" — server komponent. Faqat admin tanlagan HAQIQIY
 * sharhlar (`loadTestimonials`); bo'sh bo'lsa bo'lim umuman chizilmaydi.
 * Soxta yoki qo'lda yozilgan sharh uchun joy YO'Q — ataylab.
 *
 * `Review` sxemasi (AggregateRating) bu yerga QO'YILMAYDI: Google
 * do'konning o'zi haqidagi o'z sharhlarini ("self-serving") rad etadi.
 */
export function Testimonials({
  items,
  title,
  subtitle,
  locale,
}: {
  items: Testimonial[];
  title: string;
  subtitle: string;
  locale: Locale;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="testimonials-title" className="mx-auto max-w-7xl px-4 pb-12">
      <h2 id="testimonials-title" className="text-xl font-bold text-navy-900 dark:text-white">
        {title}
      </h2>
      <p className="mb-4 mt-1 text-sm text-navy-500 dark:text-navy-100">{subtitle}</p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <li
            key={t.id}
            className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700"
          >
            <p className="text-amber-500" role="img" aria-label={`${t.rating} / 5`}>
              {"★".repeat(t.rating)}
              <span className="text-navy-200 dark:text-navy-500">{"★".repeat(5 - t.rating)}</span>
            </p>
            <blockquote className="line-clamp-6 whitespace-pre-line text-sm leading-6 text-navy-600 dark:text-navy-100">
              {t.comment}
            </blockquote>
            <div className="mt-auto text-sm">
              <p className="font-semibold text-navy-900 dark:text-white">{t.authorName}</p>
              <Link
                href={localeHref(`/mahsulot/${t.productId}`, locale)}
                className="line-clamp-1 text-aqua-600 hover:underline dark:text-aqua-300"
              >
                {t.productName}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
