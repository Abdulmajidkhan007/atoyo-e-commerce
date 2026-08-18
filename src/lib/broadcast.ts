import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendChatMessage } from "@/lib/telegram/bot";
import { resolveChannelId, channelFooterText } from "@/lib/telegram/channel";
import { sendGenericEmail, isEmailConfigured } from "@/lib/email/mailer";

/**
 * FOYDALANUVCHILARGA E'LON: har kim o'zi foydalanadigan kanaldan oladi -
 * bot mijozlari (botUsers) Telegram DM, sayt foydalanuvchilari (users)
 * va yangilik obunachilari (subscribers) esa email orqali.
 *
 * Admin panel (/admin/xabar) ham, guruhdagi /elon buyrug'i ham shu
 * funksiyani chaqiradi. Har bir yuborish best-effort - bitta xato butun
 * ro'yxatni to'xtatmaydi.
 */
export async function sendBroadcast(params: {
  title: string;
  body: string;
  viaTelegram?: boolean;
  viaEmail?: boolean;
  /** OCHIQ KANALGA ham post qilinsinmi (obunachilar ko'radi). */
  viaChannel?: boolean;
}): Promise<{
  telegramSent: number;
  emailSent: number;
  channelPosted: boolean;
  emailNote?: string;
  channelNote?: string;
}> {
  const { title, body, viaTelegram = true, viaEmail = true, viaChannel = false } = params;
  const db = getAdminDb();
  let telegramSent = 0;
  let emailSent = 0;

  // 1) Telegram: bot mijozlari
  if (viaTelegram) {
    const botUsers = await db.collection("botUsers").limit(500).get();
    for (const doc of botUsers.docs) {
      const chatId = (doc.data() as { chatId?: number }).chatId;
      if (!chatId) continue;
      try {
        await sendChatMessage(chatId, `📢 <b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`);
        telegramSent += 1;
      } catch {
        // Bloklagan/o'chirgan foydalanuvchilar - jim o'tamiz.
      }
    }
  }

  // 2) Email: sayt foydalanuvchilari + obunachilar (takrorlarsiz)
  let emailNote: string | undefined;
  const emailReady = viaEmail ? await isEmailConfigured() : false;
  if (viaEmail && !emailReady) {
    emailNote = "SMTP sozlanmagan (Sozlamalar → Email (SMTP) bo'limiga kiriting).";
  }
  if (viaEmail && emailReady) {
    const emails = new Set<string>();
    const [users, subscribers] = await Promise.all([
      db.collection("users").limit(500).get(),
      db.collection("subscribers").limit(500).get(),
    ]);
    for (const doc of users.docs) {
      const email = (doc.data() as { email?: string | null }).email;
      if (email) emails.add(email.toLowerCase());
    }
    for (const doc of subscribers.docs) {
      const email = (doc.data() as { email?: string }).email;
      if (email) emails.add(email.toLowerCase());
    }

    if (emails.size === 0) {
      emailNote = "Email manzili bor foydalanuvchi topilmadi (ko'pchilik telefon bilan kirgan).";
    }

    const bodyHtml = `<h3>${title}</h3><p style="white-space:pre-line">${body}</p>`;
    for (const email of emails) {
      const ok = await sendGenericEmail(email, `Atoyo Santexnika — ${title}`, bodyHtml);
      if (ok) emailSent += 1;
    }
    if (emails.size > 0 && emailSent === 0) {
      emailNote = "SMTP xato berdi - kalit yoki 'App password' ni tekshiring.";
    }
  }

  /**
   * 3) OCHIQ KANAL: e'lon kanalda ham chiroyli post bo'lib chiqadi -
   * sarlavha qalin, matn tagida, oxirida do'konning odatdagi footeri
   * (telefon, manzil, havolalar) - mahsulot postlari bilan bir xil
   * ko'rinish.
   */
  let channelPosted = false;
  let channelNote: string | undefined;
  if (viaChannel) {
    const channelId = await resolveChannelId();
    if (!channelId) {
      channelNote = "Kanal sozlanmagan (Sozlamalar → Bot → kanal ID).";
    } else {
      try {
        await sendChatMessage(
          channelId,
          `📢 <b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}${await channelFooterText()}`
        );
        channelPosted = true;
      } catch (error) {
        channelNote = error instanceof Error ? error.message : "Kanalga yuborilmadi.";
      }
    }
  }

  return { telegramSent, emailSent, channelPosted, emailNote, channelNote };
}

/** Telegram HTML rejimida `<`, `>`, `&` belgilari xato beradi. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
