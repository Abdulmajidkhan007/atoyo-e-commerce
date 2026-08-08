"use client";

import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, TextField } from "@mui/material";
import { formatSom } from "@/lib/format";

interface DayRow {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

interface ProductRow {
  productId: string;
  name: string;
  qty: number;
  revenue: number;
  profit: number;
}

interface ReportData {
  totals: {
    revenue: number;
    profit: number;
    orders: number;
    averageCheck: number;
    costCoverage: number;
  };
  daily: DayRow[];
  topProducts: ProductRow[];
}

const PRESETS = [
  { label: "Bugun", days: 1 },
  { label: "7 kun", days: 7 },
  { label: "30 kun", days: 30 },
  { label: "90 kun", days: 90 },
];

/** Do'kon egasi uchun tushum va foyda hisoboti. */
export function ReportsPanel() {
  const [days, setDays] = useState(30);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** "Yangilash" tugmasi shu sonni oshiradi - effekt qayta ishlaydi. */
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        const query = from && to ? `from=${from}&to=${to}` : `days=${days}`;
        const res = await fetch(`/api/admin/reports?${query}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(body.error ?? "Hisobotni olib bo'lmadi.");
        setData(body as ReportData);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Xatolik.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [days, from, to, reloadKey]);

  const maxRevenue = Math.max(1, ...(data?.daily ?? []).map((row) => row.revenue));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.days}
            size="small"
            variant={!from && !to && days === preset.days ? "contained" : "outlined"}
            onClick={() => {
              setFrom("");
              setTo("");
              setDays(preset.days);
            }}
          >
            {preset.label}
          </Button>
        ))}
        <TextField
          size="small"
          type="date"
          label="dan"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="gacha"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Button
          size="small"
          onClick={() => {
            setLoading(true);
            setReloadKey((key) => key + 1);
          }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={18} /> : "Yangilash"}
        </Button>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Tushum" value={formatSom(data.totals.revenue)} />
            <Stat label="Foyda" value={formatSom(data.totals.profit)} accent />
            <Stat label="Buyurtmalar" value={String(data.totals.orders)} />
            <Stat label="O'rtacha chek" value={formatSom(data.totals.averageCheck)} />
          </div>

          {data.totals.costCoverage < 100 && (
            <Alert severity="info">
              Buyurtma qatorlarining {data.totals.costCoverage}% ida tannarx yozilgan — foyda
              faqat shulardan hisoblangan. Mahsulotlarga tannarx kiritsangiz raqam aniqroq bo&apos;ladi.
            </Alert>
          )}

          <div>
            <h3 className="mb-2 font-semibold text-navy-900 dark:text-white">Kunlik</h3>
            <div className="flex flex-col gap-1">
              {data.daily.length === 0 && (
                <p className="text-sm text-navy-300">Bu davrda buyurtma yo&apos;q.</p>
              )}
              {data.daily.map((row) => (
                <div key={row.date} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0 text-navy-300">{row.date.slice(5)}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-navy-50 dark:bg-navy-900">
                    <div
                      className="h-full bg-aqua-500"
                      style={{ width: `${Math.round((row.revenue / maxRevenue) * 100)}%` }}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right text-navy-900 dark:text-white">
                    {formatSom(row.revenue)}
                  </span>
                  <span className="w-24 shrink-0 text-right text-navy-300">+{formatSom(row.profit)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-navy-900 dark:text-white">
              Eng ko&apos;p daromad keltirgan mahsulotlar
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-navy-300">
                  <tr>
                    <th className="py-1">Mahsulot</th>
                    <th className="py-1 text-right">Soni</th>
                    <th className="py-1 text-right">Tushum</th>
                    <th className="py-1 text-right">Foyda</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((row) => (
                    <tr key={row.productId} className="border-t border-navy-100 dark:border-navy-500">
                      <td className="py-1.5 text-navy-900 dark:text-white">{row.name}</td>
                      <td className="py-1.5 text-right">{row.qty}</td>
                      <td className="py-1.5 text-right">{formatSom(row.revenue)}</td>
                      <td className="py-1.5 text-right text-aqua-600">{formatSom(row.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
      <p className="text-xs text-navy-300">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${
          accent ? "text-aqua-600" : "text-navy-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
