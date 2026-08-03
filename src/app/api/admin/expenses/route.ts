import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { sendTopicMessage } from "@/lib/telegram/bot";
import {
  expenseStatus,
  monthlyShare,
  nextDueDate,
  toUzs,
  DUE_SOON_DAYS,
  type Expense,
  type ExpensePayment,
} from "@/types/expense";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** USD kursi shu hujjatda (admin o'zi yangilab turadi). */
const FINANCE_DOC = { collection: "settings", doc: "finance" } as const;
const DEFAULT_USD_RATE = 12600;

const expenseSchema = z.object({
  name: z.string().min(2).max(120),
  vendor: z.string().max(80).optional(),
  amount: z.number().nonnegative(),
  currency: z.enum(["USD", "UZS"]),
  period: z.enum(["once", "monthly", "quarterly", "yearly"]),
  dueDate: z.number().int(),
  payUrl: z.string().url().max(300).optional().or(z.literal("")),
  note: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

const patchSchema = z.union([
  z.object({ id: z.string().min(1), action: z.literal("pay"), note: z.string().max(300).optional() }),
  z.object({ id: z.string().min(1), action: z.literal("update"), data: expenseSchema.partial() }),
]);

async function getUsdRate(): Promise<number> {
  const snap = await getAdminDb().collection(FINANCE_DOC.collection).doc(FINANCE_DOC.doc).get();
  const rate = (snap.data() as { usdRate?: number } | undefined)?.usdRate;
  return typeof rate === "number" && rate > 0 ? rate : DEFAULT_USD_RATE;
}

function money(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU").replace(/ /g, " ")} so'm`;
}

/**
 * MUDDAT ESLATMASI. Muddati o'tgan yoki 7 kun ichida keladigan
 * to'lovlar xodimlar guruhiga yoziladi — kuniga BIR MARTA (har bir
 * xarajat uchun `lastReminderAt` bilan cheklanadi). Cron kerak emas:
 * admin panel ochilganda tekshiriladi.
 */
async function sendDueReminders(expenses: Expense[], usdRate: number): Promise<void> {
  const now = Date.now();
  const due = expenses.filter((expense) => {
    if (!expense.isActive) return false;
    const status = expenseStatus(expense, now);
    if (status !== "overdue" && status !== "due_soon") return false;
    return !expense.lastReminderAt || now - expense.lastReminderAt > 20 * 60 * 60 * 1000;
  });

  if (due.length === 0) return;

  const lines = due.map((expense) => {
    const days = Math.floor((expense.dueDate - now) / 86_400_000);
    const when = days < 0 ? `${Math.abs(days)} kun kechikdi` : days === 0 ? "bugun" : `${days} kun qoldi`;
    return `• <b>${expense.name}</b> — ${money(toUzs(expense.amount, expense.currency, usdRate))} (${when})`;
  });

  try {
    await sendTopicMessage("actions", `💳 <b>Loyiha to'lovlari</b>\n\n${lines.join("\n")}`);
    const batch = getAdminDb().batch();
    for (const expense of due) {
      batch.update(getAdminDb().collection("expenses").doc(expense.id), { lastReminderAt: now });
    }
    await batch.commit();
  } catch (error) {
    // Eslatma yuborilmasa ham sahifa ochilaveradi.
    console.error("To'lov eslatmasi xatosi:", error);
  }
}

export async function GET(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const db = getAdminDb();
  const [snapshot, paymentsSnap, usdRate] = await Promise.all([
    db.collection("expenses").orderBy("dueDate", "asc").limit(100).get(),
    db.collection("expensePayments").orderBy("paidAt", "desc").limit(50).get(),
    getUsdRate(),
  ]);

  const expenses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Expense);
  const payments = paymentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ExpensePayment);

  await sendDueReminders(expenses, usdRate);

  const active = expenses.filter((expense) => expense.isActive);
  const now = Date.now();
  const monthly = active.reduce((sum, expense) => sum + monthlyShare(expense, usdRate), 0);
  const next30 = active
    .filter((expense) => expense.dueDate <= now + 30 * 86_400_000)
    .reduce((sum, expense) => sum + toUzs(expense.amount, expense.currency, usdRate), 0);

  // Joriy oyda haqiqatan to'langan summa (tarixdan).
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const paidThisMonth = payments
    .filter((payment) => payment.paidAt >= monthStart.getTime())
    .reduce((sum, payment) => sum + payment.amountUzs, 0);

  return NextResponse.json({
    expenses,
    payments,
    usdRate,
    summary: {
      monthly,
      yearly: monthly * 12,
      next30,
      paidThisMonth,
      overdue: active.filter((expense) => expenseStatus(expense, now) === "overdue").length,
      dueSoon: active.filter((expense) => expenseStatus(expense, now) === "due_soon").length,
      dueSoonDays: DUE_SOON_DAYS,
    },
  });
}

export async function POST(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = expenseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const id = randomUUID();
  const now = Date.now();
  const expense: Expense = {
    id,
    ...parsed.data,
    payUrl: parsed.data.payUrl || undefined,
    isActive: parsed.data.isActive ?? true,
    lastPaidAt: null,
    lastReminderAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await getAdminDb().collection("expenses").doc(id).set(expense);
  return NextResponse.json({ expense });
}

export async function PATCH(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "So'rov noto'g'ri." }, { status: 400 });

  const db = getAdminDb();
  const ref = db.collection("expenses").doc(parsed.data.id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return NextResponse.json({ error: "Topilmadi." }, { status: 404 });

  const expense = { id: snapshot.id, ...snapshot.data() } as Expense;
  const now = Date.now();

  // ---- "To'landi" — tarixga yozamiz va keyingi sanani siljitamiz ----
  if (parsed.data.action === "pay") {
    const usdRate = await getUsdRate();
    const paymentId = randomUUID();
    const payment: ExpensePayment = {
      id: paymentId,
      expenseId: expense.id,
      name: expense.name,
      amount: expense.amount,
      currency: expense.currency,
      amountUzs: toUzs(expense.amount, expense.currency, usdRate),
      paidAt: now,
      note: parsed.data.note,
    };

    const batch = db.batch();
    batch.set(db.collection("expensePayments").doc(paymentId), payment);
    batch.update(ref, {
      lastPaidAt: now,
      lastReminderAt: null,
      dueDate: nextDueDate(expense.dueDate, expense.period, now),
      // Bir martalik to'lov to'langach ro'yxatdan chiqadi.
      isActive: expense.period === "once" ? false : expense.isActive,
      updatedAt: now,
    });
    await batch.commit();

    const updated = await ref.get();
    return NextResponse.json({ expense: { id: updated.id, ...updated.data() }, payment });
  }

  await ref.update({ ...parsed.data.data, updatedAt: now });
  const updated = await ref.get();
  return NextResponse.json({ expense: { id: updated.id, ...updated.data() } });
}

export async function DELETE(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID kerak." }, { status: 400 });

  await getAdminDb().collection("expenses").doc(id).delete();
  return NextResponse.json({ ok: true });
}

/** USD kursini saqlash. */
export async function PUT(request: Request) {
  const admin = await requirePermission("settings", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = z
    .object({ usdRate: z.number().positive().max(1_000_000) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kurs noto'g'ri." }, { status: 400 });

  await getAdminDb()
    .collection(FINANCE_DOC.collection)
    .doc(FINANCE_DOC.doc)
    .set({ usdRate: parsed.data.usdRate, updatedAt: Date.now() }, { merge: true });

  return NextResponse.json({ usdRate: parsed.data.usdRate });
}
