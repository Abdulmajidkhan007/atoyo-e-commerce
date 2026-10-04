import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPublicFaq } from "@/lib/content/faq-server";
import { faqJsonLd, localizeFaq } from "@/lib/content/faq";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { localeHref } from "@/lib/i18n/href";
import { localeAlternates } from "@/lib/seo/locale-alternates";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return {
    title: `${dict.pages.faqTitle} | Atoyo Santexnika`,
    description: dict.pages.faqIntro,
    alternates: localeAlternates("/savol-javob", locale),
  };
}

/**
 * SAVOL-JAVOB. Matn admin panelda tahrirlanadi (`/admin/sahifalar`);
 * admin hali saqlamagan bo'lsa — sozlamadan yasalgan standart savollar
 * (`defaultFaqItems`). Google uchun FAQPage sxemasi shu ro'yxatdan.
 *
 * Ochiladigan ro'yxat — `<details>`: JS'siz ishlaydi, klaviatura va
 * ekran o'quvchi uchun tayyor, javob HTMLda (SEO).
 */
export default async function FaqPage() {
  const [items, dict, locale] = await Promise.all([getPublicFaq(), getDictionary(), getLocale()]);
  const faq = localizeFaq(items, locale);

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs items={[{ name: dict.pages.faqTitle }]} locale={locale} />
      <h1 className="text-3xl font-bold text-navy-900 dark:text-white">{dict.pages.faqTitle}</h1>
      <p className="mt-2 text-navy-500 dark:text-navy-100">{dict.pages.faqIntro}</p>

      {faq.length > 0 && <JsonLd data={faqJsonLd(faq)} />}

      <div className="mt-8 flex flex-col gap-3">
        {faq.map((item, index) => (
          <details
            key={index}
            className="group rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-navy-900 dark:text-white">
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className="text-xl leading-none text-aqua-500 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-navy-600 dark:text-navy-100">
              {item.answer}
            </p>
          </details>
        ))}
      </div>

      <p className="mt-10 text-sm text-navy-500 dark:text-navy-100">
        {dict.pages.moreQuestions}{" "}
        <Link href={localeHref("/kontakt", locale)} className="font-semibold text-aqua-600 hover:underline dark:text-aqua-300">
          {dict.pages.contactUs}
        </Link>
      </p>
    </section>
  );
}
