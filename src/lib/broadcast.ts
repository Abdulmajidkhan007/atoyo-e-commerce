import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendChatMessage } from "@/lib/telegram/bot";
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
}): Promise<{ telegramSent: number; emailSent: number }> {
  const { title, body, viaTelegram = true, viaEmail = true } = params;
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
        await sendChatMessage(chatId, `📢 <b>${title}</b>\n\n${body}`);
        telegramSent += 1;
      } catch {
        // Bloklagan/o'chirgan foydalanuvchilar - jim o'tamiz.
      }
    }
  }

  // 2) Email: sayt foydalanuvchilari + obunachilar (takrorlarsiz)
  if (viaEmail && isEmailConfigured()) {
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

    const bodyHtml = `<h3>${title}</h3><p style="white-space:pre-line">${body}</p>`;
    for (const email of emails) {
      const ok = await sendGenericEmail(email, `Atoyo Santexnika — ${title}`, bodyHtml);
      if (ok) emailSent += 1;
    }
  }

  return { telegramSent, emailSent };
}
