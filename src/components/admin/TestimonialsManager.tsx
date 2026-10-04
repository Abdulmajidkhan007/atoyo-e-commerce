"use client";

import { useEffect, useState } from "react";
import { Alert, CircularProgress, FormControlLabel, Switch } from "@mui/material";
import type { Review } from "@/types/review";
import { formatDate } from "@/lib/format";

type Row = Review & { productName: string };

/**
 * BOSH SAHIFADAGI "MIJOZLAR FIKRI".
 *
 * Bu yerda sharh YOZILMAYDI — faqat mijozlar mahsulot sahifasida (yoki
 * botda) qoldirgan haqiqiy sharhlardan tanlanadi. Mijoz sharhini
 * o'zgartirsa belgi tushib qoladi va qayta tanlash kerak bo'ladi.
 */
export function TestimonialsManager({ initialShow }: { initialShow: boolean }) {
  const [show, setShow] = useState(initialShow);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/reviews")
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { reviews?: Row[]; error?: string };
        if (cancelled) return;
        if (!res.ok) setError(body.error ?? "Sharhlar o'qilmadi.");
        else setRows(body.reviews ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSection = async (next: boolean) => {
    setError(null);
    setBusy("section");
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showTestimonials: next }),
      });
      if (!res.ok) throw new Error("Saqlanmadi.");
      setShow(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik.");
    } finally {
      setBusy(null);
    }
  };

  const toggleReview = async (id: string, featured: boolean) => {
    setError(null);
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/reviews/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Saqlanmadi.");
      setRows((current) => current.map((r) => (r.id === id ? { ...r, featured } : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik.");
    } finally {
      setBusy(null);
    }
  };

  const featuredCount = rows.filter((r) => r.featured).length;

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <FormControlLabel
        control={<Switch checked={show} disabled={busy === "section"} onChange={(e) => toggleSection(e.target.checked)} />}
        label="Bosh sahifada «Mijozlar fikri» bo'limini ko'rsatish"
      />
      <p className="text-sm text-navy-300">
        Tanlangan: {featuredCount} ta (saytda eng yangi 9 tasi chiqadi). Mahsuloti yashirilgan yoki o&apos;chirilgan
        sharh chiqmaydi.
      </p>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <CircularProgress size={24} />
      ) : rows.length === 0 ? (
        <Alert severity="info">Hali sharh yo&apos;q. Mijozlar mahsulot sahifasida sharh qoldirgach shu yerda chiqadi.</Alert>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-2 rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-navy-900 dark:text-white">
                  {r.authorName} · <span className="text-amber-500">{"★".repeat(Math.max(0, Math.min(5, r.rating)))}</span>
                </span>
                <span className="text-navy-300">{formatDate(r.createdAt)}</span>
              </div>
              <p className="text-xs text-navy-400">{r.productName}</p>
              <p className="whitespace-pre-line text-sm text-navy-600 dark:text-navy-100">{r.comment}</p>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={r.featured === true}
                    disabled={busy === r.id}
                    onChange={(e) => toggleReview(r.id, e.target.checked)}
                  />
                }
                label="Bosh sahifada"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
