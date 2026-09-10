import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  isPaymeConfigured,
  isClickConfigured,
  isAnyPaymentConfigured,
  buildPaymeCheckoutUrl,
  buildClickCheckoutUrl,
} from "@/lib/payments/config";
import type { Order } from "@/types/order";
import { formatSom } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "To'lov | Atoyo Santexnika" };

/**
 * Onlayn to'lov sahifasi: buyurtma uchun Payme/Click tugmalari.
 * Merchant kalitlari env'da bo'lmasa - "hali ulanmagan" xabari chiqadi
 * (buyurtma baribir qabul qilingan, operator bog'lanadi).
 */
export default async function PaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const snap = await getAdminDb().collection("orders").doc(orderId).get();
  if (!snap.exists) notFound();
  const order = { id: snap.id, ...snap.data() } as Order;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo.uz";
  const isPaid = order.paymentStatus === "paid";

  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl2 border border-navy-100 bg-white p-6 text-center dark:border-navy-500 dark:bg-navy-700">
        <h1 className="text-xl font-bold text-navy-900 dark:text-white">
          💳 Buyurtma #{order.id.slice(0, 8)}
        </h1>
        <p className="mt-2 text-3xl font-bold text-aqua-600 dark:text-aqua-300">
          {formatSom(order.totalAmount)}
        </p>

        {isPaid ? (
          <p className="mt-6 rounded-lg bg-green-50 p-4 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            ✅ Bu buyurtma to&apos;langan. Rahmat!
          </p>
        ) : !isAnyPaymentConfigured() ? (
          <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            Onlayn to&apos;lov tizimi hozircha ulanmagan. Buyurtmangiz qabul qilindi —
            operator siz bilan bog&apos;lanadi va to&apos;lovni kelishib olasiz.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            <p className="text-sm text-navy-300">To&apos;lov usulini tanlang:</p>
            {isPaymeConfigured() && (
              <a
                href={buildPaymeCheckoutUrl(order.id, order.totalAmount)}
                className="rounded-xl bg-[#33CCCC] px-6 py-3 font-bold text-white transition hover:opacity-90"
              >
                Payme orqali to&apos;lash
              </a>
            )}
            {isClickConfigured() && (
              <a
                href={buildClickCheckoutUrl(order.id, order.totalAmount, `${siteUrl}/tolov/${order.id}`)}
                className="rounded-xl bg-[#0073FF] px-6 py-3 font-bold text-white transition hover:opacity-90"
              >
                Click orqali to&apos;lash
              </a>
            )}
          </div>
        )}

        <Link href="/profil" className="mt-6 inline-block text-sm text-aqua-600 hover:underline dark:text-aqua-300">
          Buyurtmalarim sahifasiga qaytish
        </Link>
      </div>
    </section>
  );
}
