import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { verifyOrderAccessToken } from "@/lib/orders/access-token";
import { getTransferSettings } from "@/lib/payments/transfer";
import { isTransferUsable } from "@/types/payment-transfer";
import Link from "next/link";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { localeHref } from "@/lib/i18n/href";
import { formatSom } from "@/lib/format";
import { TransferPanel } from "@/components/checkout/TransferPanel";
import type { Order } from "@/types/order";

export const dynamic = "force-dynamic";

/** Shaxsiy sahifa — qidiruvga tushmaydi. */
export const metadata: Metadata = {
  title: "Buyurtma | Atoyo Santexnika",
  robots: { index: false, follow: false },
};

/**
 * BUYURTMA SAHIFASI — "qabul qilindi" + (o'tkazmada) karta va chek.
 *
 * Kirish: `?t=<kalit>` (1 klikda — mehmon) yoki o'z buyurtmasi
 * (tizimga kirgan). Aks holda 404 — buyurtma borligi ham bilinmasin.
 * Sahifada faqat mijozning o'zi kiritgan va to'laydigan narsa bor:
 * tannarx yoki ichki maydonlar chiqmaydi (`orders` da ular yo'q ham).
 */
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ orderId }, query, dict, locale] = await Promise.all([params, searchParams, getDictionary(), getLocale()]);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) notFound();
  const token = Array.isArray(query.t) ? query.t[0] : query.t;

  const snap = await getAdminDb().collection("orders").doc(orderId).get();
  if (!snap.exists) notFound();
  const order = { id: snap.id, ...snap.data() } as Order;

  const byToken = verifyOrderAccessToken(token, order.accessTokenHash);
  const byOwner =
    !byToken && order.userId ? (await getCurrentAppUser().catch(() => null))?.uid === order.userId : false;
  if (!byToken && !byOwner) notFound();

  const transfer = order.paymentMethod === "transfer" ? await getTransferSettings() : null;
  const t = dict.payment;

  return (
    <section className="mx-auto max-w-xl px-4 py-8">
      <div className="rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <p className="text-sm font-medium text-aqua-700 dark:text-aqua-300">{t.orderReceived}</p>
        <h1 className="mt-1 text-xl font-bold text-navy-900 dark:text-white">
          {t.orderNumber.replace("{id}", order.id.slice(0, 8))}
        </h1>
        {/* HOLAT — mehmonda boshqa kanal yo'q, bekor qilingani shu yerda
            ko'rinishi shart (tekshiruvchi D8). */}
        <p className="mt-1 text-sm text-navy-500 dark:text-navy-100">
          {t.statusLabel}: <b>{dict.profile.status[order.status]}</b>
        </p>

        <ul className="mt-4 flex flex-col gap-1.5 text-sm text-navy-600 dark:text-navy-100">
          {order.items.map((item, index) => (
            <li key={`${item.productId}:${item.variantId ?? ""}:${index}`} className="flex justify-between gap-3">
              <span className="min-w-0">
                {item.name}
                {item.variantLabel ? ` · ${item.variantLabel}` : ""} × {item.quantity}
              </span>
              <span className="shrink-0">{formatSom(item.price * item.quantity)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-3 text-navy-300">
            <span>{t.delivery}</span>
            <span>{order.deliveryFee ? formatSom(order.deliveryFee) : t.free}</span>
          </li>
        </ul>
        <p className="mt-3 flex justify-between border-t border-navy-100 pt-3 text-lg font-bold text-navy-900 dark:border-navy-500 dark:text-white">
          <span>{t.total}</span>
          <span>{formatSom(order.totalAmount)}</span>
        </p>
      </div>

      {order.status === "cancelled" ? (
        <p role="status" className="mt-4 rounded-xl2 border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-900/20 dark:text-red-200">
          {dict.profile.cancelled}
        </p>
      ) : order.paymentMethod === "transfer" && transfer && isTransferUsable(transfer) ? (
        <TransferPanel
          orderId={order.id}
          token={byToken ? (token ?? "") : ""}
          amount={order.totalAmount}
          card={{
            number: transfer.cardNumber,
            holder: transfer.cardHolder,
            bank: transfer.bankName,
            note: transfer.note,
          }}
          paymentStatus={order.paymentStatus}
          hasReceipt={Boolean(order.receipt)}
          cancelled={false}
        />
      ) : order.paymentMethod === "online" && order.paymentStatus !== "paid" ? (
        <p className="mt-4 text-center">
          <Link href={localeHref(`/tolov/${order.id}`, locale)} className="font-semibold text-aqua-700 underline dark:text-aqua-300">
            {t.goToOnlinePayment}
          </Link>
        </p>
      ) : (
        <p className="mt-4 rounded-xl2 border border-aqua-500/30 bg-aqua-50/60 p-4 text-sm text-navy-600 dark:bg-navy-800 dark:text-navy-100">
          {order.paymentMethod === "cash" ? t.cashNote : t.operatorWillCall}
        </p>
      )}

      <p className="mt-4 text-center text-xs text-navy-300">{t.keepLink}</p>
    </section>
  );
}
