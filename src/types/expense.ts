/**
 * LOYIHA XARAJATLARI (Firebase, domen, AI kalitlari, SMS, Play Store...).
 *
 * Bu — do'kon xaridlari emas, LOYIHANI ushlab turish xarajatlari.
 * Maqsad: qaysi to'lov qachon kelishi va qanchaga tushishi doim
 * ko'rinib tursin, muddat o'tib xizmat o'chib qolmasin.
 *
 * Client ham (panel), server ham (API) ishlatadi — "server-only" YO'Q.
 */

export type ExpensePeriod = "once" | "monthly" | "quarterly" | "yearly";

export const EXPENSE_PERIOD_LABELS: Record<ExpensePeriod, string> = {
  once: "Bir martalik",
  monthly: "Oylik",
  quarterly: "Choraklik",
  yearly: "Yillik",
};

export type ExpenseCurrency = "USD" | "UZS";

export interface Expense {
  id: string;
  /** "Firebase Blaze", "Anthropic API", "atoyo.uz domeni" */
  name: string;
  /** Kimga to'lanadi: Google, Anthropic, Eskiz... */
  vendor?: string;
  amount: number;
  currency: ExpenseCurrency;
  period: ExpensePeriod;
  /** Keyingi to'lov sanasi (ms). */
  dueDate: number;
  /** To'lov sahifasi havolasi (Google Billing, console va h.k.). */
  payUrl?: string;
  note?: string;
  isActive: boolean;
  lastPaidAt?: number | null;
  /** Telegramga eslatma yuborilgan vaqt (kuniga bir marta yuborish uchun). */
  lastReminderAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

/** To'langan to'lov yozuvi (tarix). */
export interface ExpensePayment {
  id: string;
  expenseId: string;
  name: string;
  amount: number;
  currency: ExpenseCurrency;
  /** To'lov paytidagi kurs bo'yicha so'mdagi qiymati. */
  amountUzs: number;
  paidAt: number;
  note?: string;
}

/** Muddat holati — panelda rang bilan ko'rsatiladi. */
export type ExpenseStatus = "paid" | "upcoming" | "due_soon" | "overdue";

/** Necha kun qolganda "muddati yaqin" deb hisoblanadi. */
export const DUE_SOON_DAYS = 7;

export function expenseStatus(expense: Expense, now = Date.now()): ExpenseStatus {
  const days = Math.floor((expense.dueDate - now) / 86_400_000);
  if (days < 0) return "overdue";
  if (days <= DUE_SOON_DAYS) return "due_soon";
  return "upcoming";
}

/** Keyingi to'lov sanasi (davriylikka qarab siljitiladi). */
export function nextDueDate(dueDate: number, period: ExpensePeriod, from = Date.now()): number {
  if (period === "once") return dueDate;
  // Muddat o'tib ketgan bo'lsa ham keyingi sana KELAJAKDA bo'lishi kerak,
  // shuning uchun bugungi kundan oshguncha siljitamiz.
  const date = new Date(Math.max(dueDate, from));
  const step = period === "monthly" ? 1 : period === "quarterly" ? 3 : 12;
  const base = new Date(dueDate);
  let result = new Date(base);
  while (result.getTime() <= date.getTime()) {
    result = new Date(result.setMonth(result.getMonth() + step));
  }
  return result.getTime();
}

/** So'mdagi qiymat (USD bo'lsa kurs bo'yicha). */
export function toUzs(amount: number, currency: ExpenseCurrency, usdRate: number): number {
  return currency === "USD" ? Math.round(amount * usdRate) : Math.round(amount);
}

/** Oylik o'rtacha xarajat (yillik/choraklik bo'lingan holda). */
export function monthlyShare(expense: Expense, usdRate: number): number {
  const uzs = toUzs(expense.amount, expense.currency, usdRate);
  switch (expense.period) {
    case "monthly":
      return uzs;
    case "quarterly":
      return Math.round(uzs / 3);
    case "yearly":
      return Math.round(uzs / 12);
    default:
      return 0; // bir martalik to'lov oylik yukka kirmaydi
  }
}
