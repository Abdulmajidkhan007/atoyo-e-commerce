"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Chip, CircularProgress, IconButton, MenuItem, TextField } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  EXPENSE_PERIOD_LABELS,
  expenseStatus,
  toUzs,
  type Expense,
  type ExpenseCurrency,
  type ExpensePayment,
  type ExpensePeriod,
} from "@/types/expense";

/**
 * LOYIHA TO'LOVLARI paneli.
 *
 * Google/Anthropic/Eskiz kabi xizmatlar hisobini API orqali TO'LAB
 * bo'lmaydi (ularda bunday API yo'q) — shuning uchun bu yerda to'lov
 * MUDDATI, summasi va holati yuritiladi, "To'lash" tugmasi esa
 * o'sha xizmatning to'lov sahifasini ochadi. To'lagandan keyin
 * «To'landi» bosiladi: tarixga yozuv tushadi va keyingi sana
 * davriylikka qarab siljiydi.
 */

interface ApiData {
  expenses: Expense[];
  payments: ExpensePayment[];
  usdRate: number;
  summary: {
    monthly: number;
    yearly: number;
    next30: number;
    paidThisMonth: number;
    overdue: number;
    dueSoon: number;
    dueSoonDays: number;
  };
}

/** Tez qo'shish uchun tayyor shablonlar (odatdagi loyiha xarajatlari). */
const TEMPLATES: { name: string; vendor: string; amount: number; currency: ExpenseCurrency; period: ExpensePeriod; payUrl: string }[] = [
  { name: "Firebase (Blaze)", vendor: "Google", amount: 25, currency: "USD", period: "monthly", payUrl: "https://console.cloud.google.com/billing" },
  { name: "AI yordamchi (Anthropic)", vendor: "Anthropic", amount: 10, currency: "USD", period: "monthly", payUrl: "https://console.anthropic.com/settings/billing" },
  { name: "AI rasm (Gemini)", vendor: "Google", amount: 5, currency: "USD", period: "monthly", payUrl: "https://aistudio.google.com/apikey" },
  { name: "Domen", vendor: "Registrator", amount: 15, currency: "USD", period: "yearly", payUrl: "" },
  { name: "SMS (Eskiz)", vendor: "Eskiz.uz", amount: 200000, currency: "UZS", period: "monthly", payUrl: "https://my.eskiz.uz" },
  { name: "Play Store (bir martalik)", vendor: "Google", amount: 25, currency: "USD", period: "once", payUrl: "https://play.google.com/console" },
];

const STATUS_CHIP: Record<string, { label: string; color: "default" | "warning" | "error" | "success" }> = {
  overdue: { label: "Muddati o'tdi", color: "error" },
  due_soon: { label: "Yaqinlashdi", color: "warning" },
  upcoming: { label: "Muddati bor", color: "success" },
  paid: { label: "To'langan", color: "default" },
};

function money(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU").replace(/ /g, " ")} so'm`;
}

function dateInput(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  name: "",
  vendor: "",
  amount: "",
  currency: "USD" as ExpenseCurrency,
  period: "monthly" as ExpensePeriod,
  dueDate: dateInput(Date.now() + 30 * 86_400_000),
  payUrl: "",
  note: "",
};

export function ExpensesPanel() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/expenses");
        const body = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setData(body);
          setRate(String(body.usdRate));
        } else {
          setMessage({ kind: "error", text: body.error ?? "Ma'lumot olinmadi." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);

  const send = async (init: RequestInit, okText: string, query = "") => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/expenses${query}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Xatolik yuz berdi.");
      setMessage({ kind: "ok", text: okText });
      refresh();
      return true;
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addExpense = async () => {
    const amount = Number(form.amount);
    if (form.name.trim().length < 2 || !Number.isFinite(amount) || amount < 0) {
      setMessage({ kind: "error", text: "Nom va summani to'g'ri kiriting." });
      return;
    }
    const ok = await send(
      {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          vendor: form.vendor.trim() || undefined,
          amount,
          currency: form.currency,
          period: form.period,
          dueDate: new Date(form.dueDate).getTime(),
          payUrl: form.payUrl.trim() || undefined,
          note: form.note.trim() || undefined,
        }),
      },
      "Xarajat qo'shildi."
    );
    if (ok) setForm(EMPTY_FORM);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <CircularProgress />
      </div>
    );
  }

  const usdRate = data?.usdRate ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {message && <Alert severity={message.kind === "ok" ? "success" : "error"}>{message.text}</Alert>}

      {/* ---- Umumiy ko'rsatkichlar ---- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Oyiga (o'rtacha)", value: money(data?.summary.monthly ?? 0) },
          { label: "Yiliga", value: money(data?.summary.yearly ?? 0) },
          { label: "30 kun ichida to'lanadi", value: money(data?.summary.next30 ?? 0) },
          { label: "Shu oyda to'langan", value: money(data?.summary.paidThisMonth ?? 0) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl2 border border-navy-100 bg-white p-3 dark:border-navy-500 dark:bg-navy-700"
          >
            <p className="text-xs text-navy-300">{card.label}</p>
            <p className="text-lg font-bold text-navy-900 dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {((data?.summary.overdue ?? 0) > 0 || (data?.summary.dueSoon ?? 0) > 0) && (
        <Alert severity={(data?.summary.overdue ?? 0) > 0 ? "error" : "warning"}>
          {(data?.summary.overdue ?? 0) > 0 && `${data?.summary.overdue} ta to'lov muddati o'tgan. `}
          {(data?.summary.dueSoon ?? 0) > 0 &&
            `${data?.summary.dueSoon} ta to'lov ${data?.summary.dueSoonDays} kun ichida. `}
          Xodimlar guruhiga eslatma yuborildi.
        </Alert>
      )}

      {/* ---- Kurs ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <TextField
          size="small"
          label="1 USD = ... so'm"
          value={rate}
          onChange={(event) => setRate(event.target.value.replace(/[^\d.]/g, ""))}
          sx={{ maxWidth: 180 }}
        />
        <Button
          variant="outlined"
          size="small"
          disabled={busy || !Number(rate)}
          onClick={() => send({ method: "PUT", body: JSON.stringify({ usdRate: Number(rate) }) }, "Kurs saqlandi.")}
        >
          Kursni saqlash
        </Button>
        <span className="text-xs text-navy-300">
          Dollardagi xarajatlar shu kurs bo&apos;yicha so&apos;mga o&apos;giriladi.
        </span>
      </div>

      {/* ---- Ro'yxat ---- */}
      <div className="overflow-x-auto rounded-xl2 border border-navy-100 dark:border-navy-500">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-navy-50 text-left text-xs uppercase text-navy-400 dark:bg-navy-600 dark:text-navy-100">
            <tr>
              <th className="px-3 py-2">Nomi</th>
              <th className="px-3 py-2">Summa</th>
              <th className="px-3 py-2">Davriylik</th>
              <th className="px-3 py-2">Keyingi to&apos;lov</th>
              <th className="px-3 py-2">Holati</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(data?.expenses ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-navy-300">
                  Hozircha xarajat qo&apos;shilmagan. Pastdagi shablonlardan foydalaning.
                </td>
              </tr>
            )}

            {(data?.expenses ?? []).map((expense) => {
              const status = expense.isActive ? expenseStatus(expense) : "paid";
              const chip = STATUS_CHIP[status]!;
              return (
                <tr key={expense.id} className="border-t border-navy-100 dark:border-navy-500">
                  <td className="px-3 py-2">
                    <span className="font-medium text-navy-900 dark:text-white">{expense.name}</span>
                    {expense.vendor && <span className="block text-xs text-navy-300">{expense.vendor}</span>}
                  </td>
                  <td className="px-3 py-2">
                    {expense.currency === "USD" ? `$${expense.amount}` : money(expense.amount)}
                    {expense.currency === "USD" && (
                      <span className="block text-xs text-navy-300">
                        ≈ {money(toUzs(expense.amount, "USD", usdRate))}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-navy-500 dark:text-navy-100">
                    {EXPENSE_PERIOD_LABELS[expense.period]}
                  </td>
                  <td className="px-3 py-2 text-navy-500 dark:text-navy-100">
                    {new Date(expense.dueDate).toLocaleDateString("uz-UZ")}
                  </td>
                  <td className="px-3 py-2">
                    <Chip size="small" label={chip.label} color={chip.color} variant="outlined" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {expense.payUrl && (
                        <IconButton
                          size="small"
                          title="To'lov sahifasini ochish"
                          onClick={() => window.open(expense.payUrl, "_blank", "noopener")}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      )}
                      <Button
                        size="small"
                        startIcon={<CheckCircleOutlineIcon />}
                        disabled={busy}
                        onClick={() =>
                          send({ method: "PATCH", body: JSON.stringify({ id: expense.id, action: "pay" }) }, "To'lov yozildi.")
                        }
                      >
                        To&apos;landi
                      </Button>
                      <IconButton
                        size="small"
                        title="O'chirish"
                        disabled={busy}
                        onClick={() => {
                          if (confirm(`"${expense.name}" o'chirilsinmi?`)) {
                            send({ method: "DELETE" }, "O'chirildi.", `?id=${expense.id}`);
                          }
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---- Yangi xarajat ---- */}
      <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
        <p className="text-sm font-medium text-navy-700 dark:text-navy-100">Yangi xarajat</p>

        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((template) => (
            <Chip
              key={template.name}
              size="small"
              variant="outlined"
              label={template.name}
              onClick={() =>
                setForm({
                  ...EMPTY_FORM,
                  name: template.name,
                  vendor: template.vendor,
                  amount: String(template.amount),
                  currency: template.currency,
                  period: template.period,
                  payUrl: template.payUrl,
                })
              }
            />
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <TextField
            size="small"
            label="Nomi"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <TextField
            size="small"
            label="Kimga to'lanadi"
            value={form.vendor}
            onChange={(event) => setForm({ ...form, vendor: event.target.value })}
          />
          <TextField
            size="small"
            label="Summa"
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value.replace(/[^\d.]/g, "") })}
          />
          <TextField
            size="small"
            select
            label="Valyuta"
            value={form.currency}
            onChange={(event) => setForm({ ...form, currency: event.target.value as ExpenseCurrency })}
          >
            <MenuItem value="USD">USD</MenuItem>
            <MenuItem value="UZS">So&apos;m</MenuItem>
          </TextField>
          <TextField
            size="small"
            select
            label="Davriylik"
            value={form.period}
            onChange={(event) => setForm({ ...form, period: event.target.value as ExpensePeriod })}
          >
            {(Object.keys(EXPENSE_PERIOD_LABELS) as ExpensePeriod[]).map((period) => (
              <MenuItem key={period} value={period}>
                {EXPENSE_PERIOD_LABELS[period]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="date"
            label="Keyingi to'lov sanasi"
            InputLabelProps={{ shrink: true }}
            value={form.dueDate}
            onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
          />
          <TextField
            size="small"
            label="To'lov havolasi"
            className="md:col-span-2"
            value={form.payUrl}
            onChange={(event) => setForm({ ...form, payUrl: event.target.value })}
          />
          <TextField
            size="small"
            label="Izoh"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
          />
        </div>

        <div>
          <Button variant="contained" disabled={busy} onClick={addExpense}>
            Qo&apos;shish
          </Button>
        </div>
      </div>

      {/* ---- To'lovlar tarixi ---- */}
      <div>
        <p className="mb-2 text-sm font-medium text-navy-700 dark:text-navy-100">To&apos;lovlar tarixi</p>
        <div className="flex flex-col gap-1">
          {(data?.payments ?? []).length === 0 && (
            <p className="text-sm text-navy-300">Hozircha to&apos;lov yozilmagan.</p>
          )}
          {(data?.payments ?? []).map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm dark:border-navy-500"
            >
              <span className="text-navy-900 dark:text-white">{payment.name}</span>
              <span className="text-navy-400">
                {new Date(payment.paidAt).toLocaleDateString("uz-UZ")} • {money(payment.amountUzs)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
