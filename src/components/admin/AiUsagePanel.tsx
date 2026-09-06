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

interface Tokens {
  month: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  limitUsd: number;
}

/** 1 234 567 -> "1 234 567" (o'qish oson bo'lsin). */
function groupDigits(value: number): string {
  return Math.round(value).toLocaleString("uz-UZ").replace(/,/g, " ");
}

/** Taxminiy narx (Google narxnomasi o'zgarishi mumkin). */
const USD_PER_IMAGE = 0.04;

export function AiUsagePanel() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [costLimit, setCostLimit] = useState("");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const apply = (next: Usage) => {
    setUsage(next);
    setLimit(String(next.limit));
  };

  const applyTokens = (next: Tokens) => {
    setTokens(next);
    setCostLimit(String(next.limitUsd));
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/ai/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { usage?: Usage; tokens?: Tokens } | null) => {
        if (cancelled) return;
        if (data?.usage) apply(data.usage);
        if (data?.tokens) applyTokens(data.tokens);
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
        body: JSON.stringify({
          monthlyImageLimit: Math.max(0, Math.round(Number(limit) || 0)),
          monthlyCostLimitUsd: Math.max(0, Number(costLimit) || 0),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        usage?: Usage;
        tokens?: Tokens;
        error?: string;
      };
      if (!res.ok || !body.usage) throw new Error(body.error ?? "Saqlanmadi.");
      apply(body.usage);
      if (body.tokens) applyTokens(body.tokens);
      setMessage({ kind: "ok", text: "Chegaralar saqlandi." });
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
  const costPercent =
    tokens && tokens.limitUsd > 0 ? Math.min(100, (tokens.costUsd / tokens.limitUsd) * 100) : 0;
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

      {tokens && (
        <div className="rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
          <p className="text-sm font-semibold text-navy-900 dark:text-white">
            Matn va rasm tahlili (Anthropic)
          </p>
          <p className="mt-1 text-sm text-navy-900 dark:text-white">
            <b>{tokens.month}</b>: {groupDigits(tokens.requests)} ta so&apos;rov ·{" "}
            {groupDigits(tokens.inputTokens)} kirim + {groupDigits(tokens.outputTokens)} chiqim
            token · <b>~{tokens.costUsd.toFixed(2)} $</b>
          </p>
          <p className="mt-1 text-xs text-navy-300">
            Bu — SAYT o&apos;zi sanagan taxminiy sarf (narxnoma bo&apos;yicha). Anthropic
            &quot;qolgan balans&quot; ni API orqali bermaydi — aniq raqam va balans{" "}
            <b>console.anthropic.com → Cost / Billing</b> sahifasida. Kalitning muddati yo&apos;q:
            u o&apos;zi eskirmaydi, faqat balans tugasa ishlamay qoladi.
          </p>

          {tokens.limitUsd > 0 && (
            <LinearProgress
              className="!mt-3"
              variant="determinate"
              value={costPercent}
              color={costPercent >= 100 ? "error" : costPercent >= 80 ? "warning" : "primary"}
            />
          )}

          {tokens.limitUsd > 0 && tokens.costUsd >= tokens.limitUsd && (
            <Alert severity="warning" className="!mt-3">
              Chegara to&apos;ldi — AI yordamchi, rasm tahlili va rasm bo&apos;yicha qidiruv
              vaqtincha javob bermaydi. Chegarani oshiring yoki keyingi oyni kuting.
            </Alert>
          )}

          <div className="mt-3">
            <TextField
              size="small"
              type="number"
              label="Oylik chegara, $ (0 — cheksiz)"
              value={costLimit}
              onChange={(event) => setCostLimit(event.target.value)}
              helperText="Shu summaga yetganda AI yordamchisi to'xtaydi. Yuqoridagi «Saqlash» bilan birga saqlanadi."
              className="!w-64"
            />
          </div>
        </div>
      )}
    </div>
  );
}
