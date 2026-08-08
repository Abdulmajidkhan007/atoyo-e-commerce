import "server-only";
import { logAction } from "@/lib/telegram/action-log";

/**
 * XATO HAQIDA XABAR BERISH.
 *
 * Production'da xato bo'lsa uni hech kim ko'rmasdi: butun loyihada
 * faqat `console.error` bor edi, Cloud Run loglarini esa hech kim
 * ochib o'tirmaydi. Sentry kabi alohida (pulli) xizmat qo'shish
 * o'rniga bizda allaqachon ishlaydigan kanal bor — xodimlar guruhi.
 *
 * QOIDALAR:
 *   • BEST-EFFORT: xabar ketmasa ham asosiy oqim to'xtamaydi.
 *     Xato haqidagi xabarning o'zi yangi xato tug'dirmasligi kerak.
 *   • MAXFIY MA'LUMOT YOZILMAYDI: xabarga faqat joy nomi va xato
 *     matni ketadi. Token, parol, karta raqami kabi narsalar
 *     `context` ga QO'YILMAYDI.
 *   • BIR XIL XATO SPAM QILMAYDI: 10 daqiqa ichida takrorlangan
 *     bir xil xato qayta yuborilmaydi (bitta buzilgan sahifa
 *     guruhni to'ldirib tashlamasin).
 */

/** Yuborilgan xatolar: kalit → oxirgi yuborilgan vaqt. */
const recent = new Map<string, number>();
const REPEAT_WINDOW_MS = 10 * 60 * 1000;
/** Xotira cheksiz o'smasin. */
const MAX_TRACKED = 200;

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;
  return "noma'lum xato";
}

function shouldSend(key: string, now: number): boolean {
  const last = recent.get(key);
  if (last !== undefined && now - last < REPEAT_WINDOW_MS) return false;

  if (recent.size >= MAX_TRACKED) {
    for (const [k, t] of recent) {
      if (now - t >= REPEAT_WINDOW_MS) recent.delete(k);
    }
    // Hammasi yangi bo'lsa - eng eskisini chiqaramiz.
    if (recent.size >= MAX_TRACKED) {
      const oldest = [...recent.entries()].sort((a, b) => a[1] - b[1])[0];
      if (oldest) recent.delete(oldest[0]);
    }
  }

  recent.set(key, now);
  return true;
}

/**
 * @param where Xato qayerda bo'lgani ("to'lov webhook", "buyurtma yaratish").
 * @param error Tutilgan xato.
 * @param context Qo'shimcha, MAXFIY BO'LMAGAN ma'lumot (buyurtma ID va h.k.).
 */
export async function reportError(
  where: string,
  error: unknown,
  context?: Record<string, string | number | undefined>
): Promise<void> {
  const text = messageOf(error);

  // Log baribir yoziladi - Telegram ishlamasa ham iz qoladi.
  console.error(`[${where}]`, error, context ?? "");

  try {
    if (!shouldSend(`${where}|${text}`, Date.now())) return;

    const extra = Object.entries(context ?? {})
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    await logAction(`🔴 XATO — ${where}: ${text.slice(0, 400)}${extra ? `\n(${extra})` : ""}`);
  } catch {
    // Xabar ketmadi - shu yerda to'xtaymiz, aks holda halqa hosil bo'ladi.
  }
}
