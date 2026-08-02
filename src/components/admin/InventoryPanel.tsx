"use client";

import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, MenuItem, TextField } from "@mui/material";
import { STOCK_MOVE_LABELS, type StockMove, type StockMoveType } from "@/types/inventory";

interface FoundProduct {
  id: string;
  name: string;
  code?: number | null;
  stock: number;
}

const FILTERS: { value: StockMoveType | "all"; label: string }[] = [
  { value: "all", label: "Hammasi" },
  { value: "in", label: "Kirim" },
  { value: "sale", label: "Sotuv" },
  { value: "return", label: "Qaytish" },
  { value: "out", label: "Chiqim" },
  { value: "count", label: "Sanoq" },
];

/** Ombor: harakatlar tarixi va qo'lda tuzatish (chiqim / sanoq). */
export function InventoryPanel() {
  const [moves, setMoves] = useState<StockMove[]>([]);
  const [filter, setFilter] = useState<StockMoveType | "all">("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // Qo'lda tuzatish formasi.
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<FoundProduct[]>([]);
  const [selected, setSelected] = useState<FoundProduct | null>(null);
  const [type, setType] = useState<"out" | "count">("out");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  /** Tarixni qayta o'qish uchun (saqlagandan keyin oshiriladi). */
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadMoves() {
      try {
        const query = filter === "all" ? "" : `?type=${filter}`;
        const res = await fetch(`/api/admin/inventory${query}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) setMoves(data.moves ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMoves();
    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey]);

  const search = async () => {
    if (!term.trim()) return;
    const res = await fetch(`/api/admin/products/search?q=${encodeURIComponent(term.trim())}`);
    const data = await res.json();
    setFound(
      (data.products ?? []).map((p: FoundProduct) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        stock: p.stock,
      }))
    );
  };

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selected.id,
          type,
          qty: Number(qty) || 0,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Saqlab bo'lmadi.");
      setMessage({
        kind: "ok",
        text: `${selected.name}: zaxira ${data.stockBefore} → ${data.stockAfter}`,
      });
      setQty("");
      setNote("");
      setSelected(null);
      setFound([]);
      setTerm("");
      setReloadKey((key) => key + 1);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ---- Qo'lda tuzatish ---- */}
      <section className="flex flex-col gap-3 rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
        <h2 className="font-semibold text-navy-900 dark:text-white">Chiqim yoki sanoq</h2>
        <p className="text-xs text-navy-300">
          Chiqim — singan, yo&apos;qolgan, sovg&apos;a qilingan mahsulot (zaxiradan ayiriladi).
          Sanoq — omborda haqiqatan nechta borligini kiritasiz, zaxira shu songa tenglashadi.
        </p>

        <div className="flex flex-wrap gap-2">
          <TextField
            size="small"
            label="Mahsulot qidirish"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <Button onClick={search} variant="outlined">
            Qidirish
          </Button>
        </div>

        {found.length > 0 && !selected && (
          <div className="flex flex-col gap-1">
            {found.slice(0, 8).map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelected(product)}
                className="rounded-lg border border-navy-100 p-2 text-left text-sm hover:border-aqua-500 dark:border-navy-500"
              >
                <span className="text-navy-900 dark:text-white">
                  {product.code ? `№${product.code} — ` : ""}
                  {product.name}
                </span>
                <span className="text-navy-300"> · zaxira: {product.stock}</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-navy-900 dark:text-white">
              {selected.name} (zaxira: {selected.stock})
            </span>
            <TextField
              size="small"
              select
              label="Amal"
              value={type}
              onChange={(e) => setType(e.target.value as "out" | "count")}
              className="!w-36"
            >
              <MenuItem value="out">Chiqim</MenuItem>
              <MenuItem value="count">Sanoq</MenuItem>
            </TextField>
            <TextField
              size="small"
              type="number"
              label={type === "out" ? "Nechta chiqdi" : "Haqiqiy qoldiq"}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="!w-40"
            />
            <TextField
              size="small"
              label="Izoh"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={type === "out" ? "singan / sovg'a" : "oylik sanoq"}
            />
            <Button variant="contained" onClick={submit} disabled={saving || !qty}>
              {saving ? <CircularProgress size={20} /> : "Saqlash"}
            </Button>
            <Button onClick={() => setSelected(null)}>Bekor</Button>
          </div>
        )}

        {message && <Alert severity={message.kind === "ok" ? "success" : "error"}>{message.text}</Alert>}
      </section>

      {/* ---- Tarix ---- */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => (
            <Button
              key={item.value}
              size="small"
              variant={filter === item.value ? "contained" : "outlined"}
              onClick={() => {
                setLoading(true);
                setFilter(item.value);
              }}
            >
              {item.label}
            </Button>
          ))}
          {loading && <CircularProgress size={18} />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-navy-300">
              <tr>
                <th className="py-1">Sana</th>
                <th className="py-1">Mahsulot</th>
                <th className="py-1">Amal</th>
                <th className="py-1 text-right">Miqdor</th>
                <th className="py-1 text-right">Qoldiq</th>
                <th className="py-1">Izoh</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((move) => (
                <tr key={move.id} className="border-t border-navy-100 dark:border-navy-500">
                  <td className="py-1.5 text-navy-300">
                    {new Date(move.createdAt).toLocaleString("uz-UZ", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-1.5 text-navy-900 dark:text-white">
                    {move.productCode ? `№${move.productCode} ` : ""}
                    {move.productName}
                    {move.variantLabel ? ` (${move.variantLabel})` : ""}
                  </td>
                  <td className="py-1.5">{STOCK_MOVE_LABELS[move.type]}</td>
                  <td
                    className={`py-1.5 text-right font-medium ${
                      move.qty >= 0 ? "text-aqua-600" : "text-red-500"
                    }`}
                  >
                    {move.qty > 0 ? `+${move.qty}` : move.qty}
                  </td>
                  <td className="py-1.5 text-right text-navy-300">{move.stockAfter}</td>
                  <td className="py-1.5 text-navy-300">
                    {move.note ?? ""}
                    {move.adminName ? ` · ${move.adminName}` : ""}
                  </td>
                </tr>
              ))}
              {moves.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-navy-300">
                    Hozircha yozuv yo&apos;q.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
