import "server-only";
import nodemailer from "nodemailer";
import { getEmailSecrets } from "./secrets";
import { reportError } from "@/lib/ops/report-error";
import type { Order, OrderStatus } from "@/types/order";
import { formatSom } from "@/lib/format";

/**
 * SMTP orqali email xabarnoma.
 *
 * Kalitlar `secrets/email` hujjatida (admin panelda kiritiladi) yoki
 * env'da (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
 * `SMTP_FROM`) bo'ladi. Sozlanmagan bo'lsa hech narsa yuborilmaydi -
 * sayt ishlashiga ta'sir qilmaydi.
 */

export async function isEmailConfigured(): Promise<boolean> {
  const secrets = await getEmailSecrets();
  return Boolean(secrets.host && secrets.user && secrets.pass);
}

/**
 * Xat yuboriladigan "From" manzili.
 *
 * Gmail SMTP faqat O'ZI tegishli manzil nomidan yuborishga ruxsat beradi.
 * `SMTP_FROM` da boshqa domen ko'rsatilgan bo'lsa (masalan
 * no-reply@boshqa-domen.uz), Gmail xatni qabul qilib, keyin
 * "Message not delivered ... 535 5.7.8 Username and Password not accepted"
 * bilan qaytaradi. Shu sababdan ko'rinadigan NOMni SMTP_FROM dan olamiz,
 * MANZILni esa majburan SMTP_USER ga tenglashtiramiz.
 */
function resolveFrom(secrets: { host: string; user: string; from: string }): string {
  const configured = secrets.from.trim();
  if (!configured) return secrets.user;

  const match = configured.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  const displayName = match?.[1]?.replace(/^"|"$/g, "") ?? "";
  const address = (match?.[2] ?? configured).trim();

  const isGmail = secrets.host.includes("gmail");
  if (isGmail && secrets.user && address.toLowerCase() !== secrets.user.toLowerCase()) {
    return displayName ? `"${displayName}" <${secrets.user}>` : secrets.user;
  }
  return configured;
}

/**
 * SMTP XATOSI JIM QOLMAYDI.
 *
 * MUAMMO (haqiqiy voqea): Gmail hisobining paroli almashtirildi —
 * Google shu zahoti BARCHA "App password" larni bekor qiladi, SMTP
 * esa `535 Username and Password not accepted` bilan rad eta
 * boshlaydi. Kodda faqat `console.error` bor edi, Cloud Run loglarini
 * esa hech kim ochib o'tirmaydi: buyurtma xatlari bir necha kun
 * ketmay turdi va buni hech kim bilmadi.
 *
 * Endi har muvaffaqiyatsiz yuborish xodimlar guruhining "Actions"
 * topic'iga tushadi (`reportError` o'zi takrorlanishni bosadi —
 * 10 daqiqada bir marta), auth xatosida esa NIMA QILISH kerakligi
 * ham yoziladi.
 */
function emailHint(error: unknown): string | undefined {
  const message = error instanceof Error ? error.message : String(error);
  if (/\b535\b|Username and Password not accepted|Invalid login|BadCredentials/i.test(message)) {
    return "SMTP paroli qabul qilinmadi. Gmail'da hisob paroli almashtirilsa App password BEKOR bo'ladi — Sozlamalar → Email (SMTP) da yangi App password kiriting.";
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(message)) {
    return "SMTP serveriga ulanib bo'lmadi — host/port to'g'riligini tekshiring.";
  }
  return undefined;
}

async function getTransport() {
  const secrets = await getEmailSecrets();
  return {
    transport: nodemailer.createTransport({
      host: secrets.host,
      port: secrets.port,
      secure: secrets.port === 465,
      auth: { user: secrets.user, pass: secrets.pass },
    }),
    from: resolveFrom(secrets),
  };
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Kutilmoqda",
  approved: "Qabul qilindi ✅",
  delivering: "Yetkazilmoqda 🚚",
  completed: "Yakunlandi 🎉",
  cancelled: "Bekor qilindi ❌",
};

/** Umumiy email (e'lon/xabarnoma). Sozlanmagan bo'lsa false qaytaradi. */
export async function sendGenericEmail(to: string, subject: string, bodyHtml: string): Promise<boolean> {
  if (!to || !(await isEmailConfigured())) return false;
  try {
    const { transport, from } = await getTransport();
    await transport.sendMail({
      from,
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
    await reportError("email yuborish", error, { kimga: to, mavzu: subject, yechim: emailHint(error) });
    return false;
  }
}

/** Buyurtma holati o'zgarganda mijozga email (sozlanmagan bo'lsa jim o'tadi). */
export async function sendOrderStatusEmail(to: string, order: Order, status: OrderStatus): Promise<void> {
  if (!to || !(await isEmailConfigured())) return;

  const itemsHtml = order.items
    .map((i) => `<li>${i.name} × ${i.quantity} — ${formatSom(i.price * i.quantity)}</li>`)
    .join("");

  try {
    const { transport, from } = await getTransport();
    await transport.sendMail({
      from,
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
    // Email yuborilmasa ham buyurtma oqimi to'xtamasligi kerak -
    // lekin xato endi guruhga yoziladi, jim qolmaydi.
    await reportError("buyurtma emaili", error, {
      buyurtma: order.id,
      yechim: emailHint(error),
    });
  }
}
