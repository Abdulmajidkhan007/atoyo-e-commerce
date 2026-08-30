"use client";

import { useState } from "react";
import { Alert, Button, CircularProgress, FormControlLabel, Switch, TextField } from "@mui/material";
import { useChallenge } from "./ChallengeDialog";

interface SecretView {
  masked: string;
  source: "panel" | "env" | "none";
}

export interface SecretsSnapshot {
  botToken: SecretView;
  chatId: SecretView;
  webhookSecret: SecretView;
  botUsername: SecretView;
}

const SOURCE_LABELS: Record<SecretView["source"], string> = {
  panel: "shu paneldan o'rnatilgan",
  env: "server sozlamasidan (env) olinyapti",
  none: "o'rnatilmagan",
};

/**
 * MAXFIY KALITLAR (faqat loyiha egasi ko'radi).
 *
 * Qiymatlar hech qachon to'liq ko'rsatilmaydi - faqat niqoblangan
 * ko'rinish va qayerdan kelayotgani. Yangi qiymat kiritilsa u
 * Firestore'ning server-only hujjatiga tushadi va env'dan ustun turadi;
 * "-" yozilsa panel qiymati o'chib, yana env ishlaydi.
 */
export function SecretsForm({ initial }: { initial: SecretsSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [resetWebhook, setResetWebhook] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const challenge = useChallenge();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (
      !botToken.trim() &&
      !chatId.trim() &&
      !webhookSecret.trim() &&
      !botUsername.trim() &&
      !resetWebhook
    ) {
      setMessage({ type: "error", text: "O'zgartirish uchun kamida bitta maydonni to'ldiring." });
      return;
    }

    const answer = await challenge.ask();
    if (!answer) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/secrets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...answer,
          botToken: botToken.trim(),
          chatId: chatId.trim(),
          webhookSecret: webhookSecret.trim(),
          botUsername: botUsername.trim(),
          resetWebhook,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        webhookNote?: string | null;
      };
      if (!res.ok) throw new Error(data.error ?? "Saqlanmadi.");

      setBotToken("");
      setChatId("");
      setWebhookSecret("");
      setBotUsername("");
      setResetWebhook(false);

      // Yangilangan niqoblarni qayta o'qiymiz.
      const fresh = await fetch("/api/admin/secrets");
      if (fresh.ok) {
        const freshData = (await fresh.json()) as { secrets: SecretsSnapshot };
        setSnapshot(freshData.secrets);
      }

      setMessage({
        type: data.error ? "error" : "success",
        text: data.error ?? [data.webhookNote, "Kalitlar saqlandi."].filter(Boolean).join(" "),
      });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Saqlanmadi." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
      <p className="text-xs text-navy-300">
        Qiymatlar to&apos;liq ko&apos;rsatilmaydi. Bo&apos;sh qoldirilgan maydon o&apos;zgarmaydi;{" "}
        <code>-</code> yozilsa paneldagi qiymat o&apos;chadi va yana server sozlamasidagi (env) qiymat
        ishlaydi.
      </p>

      <SecretField
        label="Bot tokeni (TELEGRAM_BOT_TOKEN)"
        current={snapshot.botToken}
        value={botToken}
        onChange={setBotToken}
      />
      <SecretField
        label="Xodimlar guruhi ID (TELEGRAM_CHAT_ID)"
        current={snapshot.chatId}
        value={chatId}
        onChange={setChatId}
      />
      <SecretField
        label="Webhook siri (TELEGRAM_WEBHOOK_SECRET)"
        current={snapshot.webhookSecret}
        value={webhookSecret}
        onChange={setWebhookSecret}
      />

      <SecretField
        label="Bot useri (@ siz, masalan Atoyo_uz_bot)"
        current={snapshot.botUsername}
        value={botUsername}
        onChange={setBotUsername}
      />
      <p className="-mt-2 text-xs text-navy-300">
        Bot almashtirilganda shu ham yangilanadi:{" "}
        <code>t.me/&lt;bot&gt;?start=login_...</code> havolasi (saytdagi &quot;Telegram orqali
        kirish&quot;) shundan yasaladi.
      </p>

      <FormControlLabel
        control={<Switch checked={resetWebhook} onChange={(e) => setResetWebhook(e.target.checked)} />}
        label="Saqlagach webhook'ni Telegram'da qayta o'rnatish"
      />

      {message && <Alert severity={message.type}>{message.text}</Alert>}

      <Button type="submit" variant="contained" disabled={saving} className="!w-fit">
        {saving ? <CircularProgress size={20} color="inherit" /> : "Kalitlarni saqlash"}
      </Button>

      {challenge.dialog}
    </form>
  );
}

function SecretField({
  label,
  current,
  value,
  onChange,
}: {
  label: string;
  current: SecretView;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Yangi qiymat (bo'sh - o'zgarmaydi)"
      helperText={`Hozir: ${current.masked || "—"} (${SOURCE_LABELS[current.source]})`}
      autoComplete="off"
    />
  );
}
