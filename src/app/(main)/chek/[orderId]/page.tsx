import { notFound, redirect } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { isStaff } from "@/lib/permissions";
import { PrintButton } from "@/components/order/PrintButton";
import type { Order } from "@/types/order";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "Kutilmoqda",
  approved: "Tasdiqlangan",
  delivering: "Yetkazilmoqda",
  completed: "Yakunlangan",
  cancelled: "Bekor qilingan",
};

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * BUYURTMA CHEKI - chop etishga (yoki brauzer orqali PDF saqlashga)
 * mos sahifa. Faqat buyurtma egasi yoki xodim ko'ra oladi.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/kirish");

  const { orderId } = await params;
  const snap = await getAdminDb().collection("orders").doc(orderId).get();
  if (!snap.exists) notFound();

  const order = { ...snap.data(), id: snap.id } as Order;
  if (order.userId !== user.uid && !isStaff(user)) notFound();

  const settings = await getSiteSettings();
  const subtotal = order.subtotal ?? order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Chek</h1>
        <PrintButton />
      </div>

      <div className="rounded-xl2 border border-navy-100 bg-white p-6 text-navy-900 dark:border-navy-500 dark:bg-navy-800 dark:text-white print:border-0 print:bg-white print:text-black">
        <header className="mb-4 border-b border-navy-100 pb-4 text-center dark:border-navy-500">
          <p className="text-lg font-bold">Atoyo Santexnika &amp; Otopleniye</p>
          <p className="text-sm text-navy-300">{settings.phone}</p>
          <p className="text-sm text-navy-300">{settings.address}</p>
        </header>

        <div className="mb-4 grid grid-cols-2 gap-1 text-sm">
          <span className="text-navy-300">Buyurtma raqami</span>
          <span className="text-right font-mono">#{order.id.slice(0, 8)}</span>
          <span className="text-navy-300">Sana</span>
          <span className="text-right">{formatDateTime(order.createdAt)}</span>
          <span className="text-navy-300">Xaridor</span>
          <span className="text-right">{order.customerName}</span>
          <span className="text-navy-300">Telefon</span>
          <span className="text-right">{order.phoneNumber}</span>
          {order.deliveryAddress && (
            <>
              <span className="text-navy-300">Manzil</span>
              <span className="text-right">{order.deliveryAddress}</span>
            </>
          )}
          <span className="text-navy-300">Holat</span>
          <span className="text-right">{STATUS_LABELS[order.status]}</span>
        </div>

        <table className="w-full border-t border-navy-100 text-sm dark:border-navy-500">
          <thead>
            <tr className="text-left text-navy-300">
              <th className="py-2">Mahsulot</th>
              <th className="py-2 text-center">Soni</th>
              <th className="py-2 text-right">Narx</th>
              <th className="py-2 text-right">Summa</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.productId} className="border-t border-navy-100 dark:border-navy-500">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-right">{formatSom(item.price)}</td>
                <td className="py-2 text-right">{formatSom(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-col gap-1 border-t border-navy-100 pt-3 text-sm dark:border-navy-500">
          <div className="flex justify-between">
            <span className="text-navy-300">Mahsulotlar</span>
            <span>{formatSom(subtotal)}</span>
          </div>
          {!!order.discountAmount && (
            <div className="flex justify-between">
              <span className="text-navy-300">Chegirma{order.promoCode ? ` (${order.promoCode})` : ""}</span>
              <span>−{formatSom(order.discountAmount)}</span>
            </div>
          )}
          {!!order.deliveryFee && (
            <div className="flex justify-between">
              <span className="text-navy-300">Yetkazib berish</span>
              <span>{formatSom(order.deliveryFee)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-navy-100 pt-2 text-base font-bold dark:border-navy-500">
            <span>Jami</span>
            <span>{formatSom(order.totalAmount)}</span>
          </div>
          <p className="mt-1 text-xs text-navy-300">
            To&apos;lov: {order.paymentMethod === "cash" ? "Naqd (yetkazilganda)" : "Onlayn"}
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-navy-300">Xaridingiz uchun rahmat!</p>
      </div>
    </section>
  );
}
