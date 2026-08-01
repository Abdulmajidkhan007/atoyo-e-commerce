import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { isStaff } from "@/lib/permissions";
import { PrintButton } from "@/components/order/PrintButton";
import type { Order } from "@/types/order";

export const dynamic = "force-dynamic";

/** Chek ranglari - logotipdan olingan brend palitrasi (inline beriladi,
 *  chunki chek dark rejimda ham, printerda ham bir xil ko'rinishi kerak). */
const BRAND = {
  navy: "#072D40",
  gold: "#C49A6C",
  goldDark: "#8A6640",
  muted: "#5E8CA6",
  line: "#DFE8EE",
  tint: "#F0E1CC",
} as const;

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
    <section className="mx-auto max-w-2xl px-4 py-8 print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Chek</h1>
        <PrintButton />
      </div>

      {/* `print-exact` - brend ranglari qog'ozda ham chiqishi uchun
          (globals.css dagi @media print qoidalari). Ranglar inline
          berilgan: chek dark rejimda ham, printerda ham bir xil. */}
      <div
        className="print-exact overflow-hidden rounded-xl2 border border-navy-100 shadow-sm dark:border-navy-500"
        style={{ backgroundColor: "#FFFFFF", color: BRAND.navy }}
      >
        {/* Brend paneli: logotip + do'kon ma'lumotlari */}
        <header className="flex items-center gap-3 px-6 py-5" style={{ backgroundColor: BRAND.navy }}>
          <Image
            src="/logo.jpg"
            alt="Atoyo Santexnika"
            width={52}
            height={52}
            className="shrink-0 rounded-xl object-cover"
            style={{ height: 52, width: 52 }}
          />
          <div className="min-w-0">
            <p className="text-lg font-bold" style={{ color: "#FFFFFF" }}>
              Atoyo Santexnika &amp; Otopleniye
            </p>
            <p className="text-xs" style={{ color: BRAND.gold }}>
              {settings.phone}
            </p>
            <p className="text-xs" style={{ color: "#9FC0D2" }}>
              {settings.address}
            </p>
          </div>
        </header>

        <div className="px-6 py-5">
          <div className="mb-4 grid grid-cols-2 gap-1 text-sm">
            <span style={{ color: BRAND.muted }}>Buyurtma raqami</span>
            <span className="text-right font-mono font-medium">#{order.id.slice(0, 8)}</span>
            <span style={{ color: BRAND.muted }}>Sana</span>
            <span className="text-right">{formatDateTime(order.createdAt)}</span>
            <span style={{ color: BRAND.muted }}>Xaridor</span>
            <span className="text-right">{order.customerName}</span>
            <span style={{ color: BRAND.muted }}>Telefon</span>
            <span className="text-right">{order.phoneNumber}</span>
            {order.deliveryAddress && (
              <>
                <span style={{ color: BRAND.muted }}>Manzil</span>
                <span className="text-right">{order.deliveryAddress}</span>
              </>
            )}
            <span style={{ color: BRAND.muted }}>Holat</span>
            <span className="text-right">{STATUS_LABELS[order.status]}</span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ backgroundColor: BRAND.tint, color: BRAND.navy }}>
                <th className="rounded-l-lg px-2 py-2">Mahsulot</th>
                <th className="px-2 py-2 text-center">Soni</th>
                <th className="px-2 py-2 text-right">Narx</th>
                <th className="rounded-r-lg px-2 py-2 text-right">Summa</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.productId} style={{ borderTop: `1px solid ${BRAND.line}` }}>
                  <td className="px-2 py-2">{item.name}</td>
                  <td className="px-2 py-2 text-center">{item.quantity}</td>
                  <td className="px-2 py-2 text-right">{formatSom(item.price)}</td>
                  <td className="px-2 py-2 text-right">{formatSom(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            className="mt-4 flex flex-col gap-1 pt-3 text-sm"
            style={{ borderTop: `1px solid ${BRAND.line}` }}
          >
            <div className="flex justify-between">
              <span style={{ color: BRAND.muted }}>Mahsulotlar</span>
              <span>{formatSom(subtotal)}</span>
            </div>
            {!!order.discountAmount && (
              <div className="flex justify-between" style={{ color: BRAND.goldDark }}>
                <span>Chegirma{order.promoCode ? ` (${order.promoCode})` : ""}</span>
                <span>−{formatSom(order.discountAmount)}</span>
              </div>
            )}
            {!!order.deliveryFee && (
              <div className="flex justify-between">
                <span style={{ color: BRAND.muted }}>Yetkazib berish</span>
                <span>{formatSom(order.deliveryFee)}</span>
              </div>
            )}

            <div
              className="mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-base font-bold"
              style={{ backgroundColor: BRAND.gold, color: BRAND.navy }}
            >
              <span>Jami</span>
              <span>{formatSom(order.totalAmount)}</span>
            </div>

            <p className="mt-1 text-xs" style={{ color: BRAND.muted }}>
              To&apos;lov: {order.paymentMethod === "cash" ? "Naqd (yetkazilganda)" : "Onlayn"}
            </p>
          </div>

          <p className="mt-6 text-center text-xs" style={{ color: BRAND.muted }}>
            Xaridingiz uchun rahmat! · atoyo-uz.web.app
          </p>
        </div>
      </div>
    </section>
  );
}
