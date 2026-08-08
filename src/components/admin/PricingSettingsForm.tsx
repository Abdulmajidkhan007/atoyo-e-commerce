"use client";

import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, TextField } from "@mui/material";
import { DEFAULT_PRICING_SETTINGS, retailFromWholesale } from "@/lib/products/wholesale";
import { formatSom } from "@/lib/format";

/**
 * NARX SOZLAMALARI.
 *
 * Katalogdagi narx — OPTOM narx (admin faqat shuni kiritadi). Oddiy
 * mijozga ko'rsatiladigan dona narx shu yerdagi foiz bilan hisoblanadi,
 * ya'ni narx o'zgarganda 10 000 mahsulotni qayta yozish shart emas.
 */
export function PricingSettingsForm() {
  const [markup, setMarkup] = useState(String(DEFAULT_PRICING_SETTINGS.retailMarkupPercent));
  const [minOrder, setMinOrder] = useState(String(DEFAULT_PRICING_SETTINGS.minOrderAmount));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/pricing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.pricing) return;
        setMarkup(String(data.pricing.retailMarkupPercent));
        setMinOrder(String(data.pricing.minOrderAmount));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retailMarkupPercent: Number(markup) || 0,
          minOrderAmount: Number(minOrder) || 0,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Saqlanmadi.");
      setMessage({ kind: "ok", text: "Saqlandi — narxlar darhol yangilanadi." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress size={24} />;

  const percent = Number(markup) || 0;
  const example = retailFromWholesale(100_000, percent);

  return (
    <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
      <p className="text-sm text-navy-300">
        Katalogdagi narx — <b>optom narx</b>. Dona mijozga ko&apos;rsatiladigan narx shu foiz bilan
        hisoblanadi. Optom mijozlar (<code>client</code> roli) optom narxni ko&apos;radi.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <TextField
          size="small"
          label="Dona ustamasi (%)"
          value={markup}
          onChange={(event) => setMarkup(event.target.value.replace(/[^\d.]/g, ""))}
          helperText={`Masalan: optom 100 000 so'm → dona ${formatSom(example)}`}
        />
        <TextField
          size="small"
          label="Eng kam buyurtma (so'm)"
          value={minOrder}
          onChange={(event) => setMinOrder(event.target.value.replace(/\D/g, ""))}
          helperText="Bundan kam summadagi buyurtma qabul qilinmaydi. 0 — cheklov yo'q."
        />
      </div>

      {message && <Alert severity={message.kind === "ok" ? "success" : "error"}>{message.text}</Alert>}

      <div>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
        </Button>
      </div>
    </div>
  );
}
