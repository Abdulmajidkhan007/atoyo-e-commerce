import "server-only";
import nodemailer from "nodemailer";
import type { Order, OrderStatus } from "@/types/order";

/**
 * SMTP orqali email xabarnoma. SMTP_* env'lar kiritilmagan bo'lsa hech
 * narsa yubormaydi (best-effort) - sayt ishlashiga ta'sir qilmaydi.
 * Netlify env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 */

export function isEmailConfigured(): boolean {
  return !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
}

function getTransport() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Kutilmoqda",
  approved: "Qabul qilindi ✅",
  delivering: "Yetkazilmoqda 🚚",
  completed: "Yakunlandi 🎉",
  cancelled: "Bekor qilindi ❌",
};

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

/** Umumiy email (e'lon/xabarnoma). Sozlanmagan bo'lsa false qaytaradi. */
export async function sendGenericEmail(to: string, subject: string, bodyHtml: string): Promise<boolean> {
  if (!isEmailConfigured() || !to) return false;
  try {
    await getTransport().sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:520px">
          <h2 style="color:#072D40">Atoyo Santexnika</h2>
          ${bodyHtml}
          <hr style="border:none;border-top:1px solid #eee" />
          <p style="color:#888;font-size:12px">Bu avtomatik xabar — javob yozish shart emas.</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Email yuborishda xato:", error);
    return false;
  }
}

/** Buyurtma holati o'zgarganda mijozga email (sozlanmagan bo'lsa jim o'tadi). */
export async function sendOrderStatusEmail(to: string, order: Order, status: OrderStatus): Promise<void> {
  if (!isEmailConfigured() || !to) return;

  const itemsHtml = order.items
    .map((i) => `<li>${i.name} × ${i.quantity} — ${formatSom(i.price * i.quantity)}</li>`)
    .join("");

  try {
    await getTransport().sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      subject: `Buyurtma #${order.id.slice(0, 8)} — ${STATUS_LABELS[status]}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px">
          <h2 style="color:#072D40">Atoyo Santexnika</h2>
          <p>Hurmatli ${order.customerName}, buyurtmangiz holati yangilandi:</p>
          <p style="font-size:18px;font-weight:bold;color:#00A399">${STATUS_LABELS[status]}</p>
          <p><b>Buyurtma:</b> #${order.id.slice(0, 8)}</p>
          <ul>${itemsHtml}</ul>
          <p><b>Jami:</b> ${formatSom(order.totalAmount)}</p>
          <hr style="border:none;border-top:1px solid #eee" />
          <p style="color:#888;font-size:12px">Bu avtomatik xabar — javob yozish shart emas.</p>
        </div>
      `,
    });
  } catch (error) {
    // Email yuborilmasa ham buyurtma oqimi to'xtamasligi kerak.
    console.error("Email yuborishda xato:", error);
  }
}
