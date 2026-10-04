import type { Metadata } from "next";
import Link from "next/link";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getDeliverySettings } from "@/lib/orders/pricing";
import { getTransferSettings } from "@/lib/payments/transfer";
import { isAnyPaymentConfigured } from "@/lib/payments/config";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { freeDeliveryText, installServiceText } from "@/lib/delivery/text";
import { isTransferUsable } from "@/types/payment-transfer";
import { formatSom } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { localeHref } from "@/lib/i18n/href";
import { localeAlternates } from "@/lib/seo/locale-alternates";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return {
    title: `${dict.pages.deliveryTitle} | Atoyo Santexnika`,
    description: dict.pages.deliveryIntro,
    alternates: localeAlternates("/yetkazib-berish", locale),
  };
}

/**
 * YETKAZIB BERISH VA TO'LOV. Bu sahifada QATTIQ YOZILGAN va'da yo'q:
 * shartlar `settings/delivery` dan (`freeDeliveryText`, hududlar,
 * o'rnatish), to'lov usullari esa haqiqatan yoqilganlaridan
 * (o'tkazma — `settings/payment`, onlayn — Payme/Click kaliti bo'lsa).
 * Admin qo'shimcha matnni Promokod → Yetkazib berish bo'limida yozadi
 * (`DeliverySettings.pageText`).
 */
export default async function DeliveryPage() {
  const [delivery, transfer, pricing, dict, locale] = await Promise.all([
    getDeliverySettings(),
    getTransferSettings(),
    getPricingSettings(),
    getDictionary(),
    getLocale(),
  ]);
  const p = dict.pages;
  const install = installServiceText(delivery);
  const zones = delivery.enabled ? (delivery.zones ?? []) : [];
  const extra = (delivery.pageText ?? "").trim();

  const payments = [p.payCash];
  if (isTransferUsable(transfer)) payments.push(p.payTransfer);
  if (isAnyPaymentConfigured()) payments.push(p.payOnline);

  const card = "rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700";
  const heading = "mb-3 flex items-center gap-2 text-lg font-semibold text-navy-900 dark:text-white";
  const text = "text-sm leading-6 text-navy-600 dark:text-navy-100";

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumbs items={[{ name: p.deliveryTitle }]} locale={locale} />
      <h1 className="text-3xl font-bold text-navy-900 dark:text-white">{p.deliveryTitle}</h1>
      <p className="mt-2 text-navy-500 dark:text-navy-100">{p.deliveryIntro}</p>

      <div className="mt-8 flex flex-col gap-4">
        <div className={card}>
          <h2 className={heading}>
            <LocalShippingOutlinedIcon className="text-aqua-500" aria-hidden="true" />
            {p.deliveryTerms}
          </h2>
          <p className={text}>{freeDeliveryText(delivery)}</p>
          {pricing.minOrderAmount > 0 && (
            <p className={`${text} mt-2`}>{p.minOrder.replace("{sum}", formatSom(pricing.minOrderAmount))}</p>
          )}
          {extra && <p className={`${text} mt-3 whitespace-pre-line`}>{extra}</p>}

          {zones.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 font-semibold text-navy-900 dark:text-white">{p.zonesTitle}</h3>
              <ul className="divide-y divide-navy-100 text-sm dark:divide-navy-500">
                {zones.map((zone) => {
                  // `lib/orders/promo.ts` bilan bir xil: hududda chegara
                  // bo'lmasa umumiy `freeFrom` ishlaydi.
                  const freeFrom = zone.freeFrom && zone.freeFrom > 0 ? zone.freeFrom : delivery.freeFrom;
                  return (
                  <li key={zone.id} className="flex flex-wrap justify-between gap-2 py-2 text-navy-600 dark:text-navy-100">
                    <span>{zone.name}</span>
                    <span className="font-medium">
                      {formatSom(zone.fee)}
                      {freeFrom > 0 ? ` · ${p.zoneFreeFrom.replace("{sum}", formatSom(freeFrom))}` : ""}
                    </span>
                  </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {install && (
          <div className={card}>
            <h2 className={heading}>
              <BuildOutlinedIcon className="text-aqua-500" aria-hidden="true" />
              {p.installTitle}
            </h2>
            <p className={text}>{install}</p>
          </div>
        )}

        <div className={card}>
          <h2 className={heading}>
            <PaymentsOutlinedIcon className="text-aqua-500" aria-hidden="true" />
            {p.paymentTitle}
          </h2>
          <ul className={`${text} list-disc pl-5`}>
            {payments.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-10 text-sm text-navy-500 dark:text-navy-100">
        {p.moreQuestions}{" "}
        <Link href={localeHref("/savol-javob", locale)} className="font-semibold text-aqua-600 hover:underline dark:text-aqua-300">
          {p.faqTitle}
        </Link>
        {" · "}
        <Link href={localeHref("/kontakt", locale)} className="font-semibold text-aqua-600 hover:underline dark:text-aqua-300">
          {p.contactUs}
        </Link>
      </p>
    </section>
  );
}
