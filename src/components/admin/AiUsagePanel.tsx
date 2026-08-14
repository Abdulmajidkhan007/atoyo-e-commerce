"use client";

import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, LinearProgress, TextField } from "@mui/material";

/**
 * AI RASM SARFI.
 *
 * Har bir chizilgan rasm Google hisobidan pul yechadi (~0.04 $).
 * Xodim tugmani ketma-ket bosaversa balans sezilmay tugab qoladi -
 * shuning uchun bu yerda shu oyda nechta rasm chizilgani ko'rinadi
 * va oylik chegara qo'yiladi. Chegara to'lganda generatsiya to'xtaydi
 * va sababi o'zbekcha aytiladi.
 */

interface Usage {
  month: string;
  used: number;
  limit: number;
}

/** Taxminiy narx (Google narxnomasi o'zgarishi mumkin). */
const USD_PER_IMAGE = 0.04;

export function AiUsagePanel() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const apply = (next: Usage) => {
    setUsage(next);
    setLimit(String(next.limit));
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/ai/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { usage?: Usage } | null) => {
        if (!cancelled && data?.usage) apply(data.usage);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ai/usage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyImageLimit: Math.max(0, Math.round(Number(limit) || 0)) }),
      });
      const body = (await res.json().catch(() => ({}))) as { usage?: Usage; error?: string };
      if (!res.ok || !body.usage) throw new Error(body.error ?? "Saqlanmadi.");
      apply(body.usage);
      setMessage({ kind: "ok", text: "Chegara saqlandi." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setSaving(false);
    }
  };

  if (!usage) {
    return (
      <div className="flex justify-center p-4">
        <CircularProgress size={22} />
      </div>
    );
  }

  const percent = usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
  const cost = usage.used * USD_PER_IMAGE;

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <div>
        <p className="text-sm text-navy-900 dark:text-white">
          <b>{usage.month}</b> oyida chizilgan rasmlar:{" "}
          <b>
            {usage.used}
            {usage.limit > 0 ? ` / ${usage.limit}` : ""}
          </b>{" "}
          ta
        </p>
        <p className="mt-1 text-xs text-navy-300">
          Taxminiy xarajat: ~{cost.toFixed(2)} $ (bitta rasm ≈ {USD_PER_IMAGE.toFixed(2)} $).
          Aniq summa Google Cloud → Billing sahifasida.
        </p>
      </div>

      {usage.limit > 0 && (
        <LinearProgress
          variant="determinate"
          value={percent}
          color={percent >= 100 ? "error" : percent >= 80 ? "warning" : "primary"}
        />
      )}

      {usage.limit > 0 && usage.used >= usage.limit && (
        <Alert severity="warning">
          Chegara to&apos;ldi — yangi rasm chizilmaydi. Chegarani oshiring yoki keyingi oyni
          kuting.
        </Alert>
      )}

      <div className="flex items-end gap-2">
        <TextField
          size="small"
          type="number"
          label="Oylik chegara (0 — cheksiz)"
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
          helperText="Shu songa yetganda AI rasm generatsiyasi to'xtaydi."
          className="!w-64"
        />
        <Button variant="contained" onClick={save} disabled={saving} className="!mb-6">
          {saving ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
        </Button>
      </div>

      {message && <Alert severity={message.kind === "ok" ? "success" : "error"}>{message.text}</Alert>}
    </div>
  );
}
