"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Chip, CircularProgress, TextField } from "@mui/material";

/**
 * EMAIL (SMTP) sozlamasi - faqat loyiha egasiga.
 *
 * Kalitlar serverdagi `secrets/email` hujjatiga yoziladi, ya'ni pochtani
 * ulash uchun qayta deploy qilish shart emas. Parol qaytarilmaydi -
 * maydon bo'sh qolsa eskisi o'zgarmaydi.
 */
interface Status {
  configured: boolean;
  host: string;
  port: number;
  user: string;
  from: string;
}

export function EmailSettingsForm() {
  const [status, setStatus] = useState<Status | null>(null);
  const [form, setForm] = useState({ host: "", port: "587", user: "", pass: "", from: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/email")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Status | null) => {
        if (!active || !data) return;
        setStatus(data);
        setForm({
          host: data.host,
          port: String(data.port || 587),
          user: data.user,
          pass: "",
          from: data.from,
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    setBusy("save");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: form.host.trim() || undefined,
          port: Number(form.port) || undefined,
          user: form.user.trim() || undefined,
          // Bo'sh qolsa eski parol saqlanadi.
          pass: form.pass.trim() || undefined,
          from: form.from.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Status & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Saqlanmadi.");
      setStatus(data);
      setForm((prev) => ({ ...prev, pass: "" }));
      setMessage({ kind: "ok", text: "Saqlandi." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy("test");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = (await res.json()) as { ok?: boolean; to?: string; error?: string };
      setMessage(
        data.ok
          ? { kind: "ok", text: `Sinov xati ${data.to} ga yuborildi — pochtani tekshiring.` }
          : { kind: "error", text: data.error ?? "Xat ketmadi." }
      );
    } catch {
      setMessage({ kind: "error", text: "Xat ketmadi." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-navy-500 dark:text-navy-100">Holati:</span>
        <Chip
          size="small"
          label={status?.configured ? "sozlangan" : "sozlanmagan"}
          color={status?.configured ? "success" : "default"}
          variant="outlined"
        />
      </div>

      {message && <Alert severity={message.kind === "ok" ? "success" : "error"}>{message.text}</Alert>}

      <div className="grid gap-3 md:grid-cols-2">
        <TextField
          size="small"
          label="SMTP host"
          placeholder="smtp.gmail.com"
          value={form.host}
          onChange={(event) => setForm({ ...form, host: event.target.value })}
        />
        <TextField
          size="small"
          label="Port"
          placeholder="587"
          value={form.port}
          onChange={(event) => setForm({ ...form, port: event.target.value.replace(/[^\d]/g, "") })}
        />
        <TextField
          size="small"
          label="Foydalanuvchi (email)"
          value={form.user}
          onChange={(event) => setForm({ ...form, user: event.target.value })}
        />
        <TextField
          size="small"
          label="Parol (Gmail uchun App password)"
          type="password"
          placeholder={status?.configured ? "o'zgartirmasangiz bo'sh qoldiring" : ""}
          value={form.pass}
          onChange={(event) => setForm({ ...form, pass: event.target.value })}
        />
        <TextField
          size="small"
          label="Kimdan (ko'rinadigan nom)"
          placeholder="Atoyo Santexnika <shop@gmail.com>"
          value={form.from}
          onChange={(event) => setForm({ ...form, from: event.target.value })}
          className="md:col-span-2"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="contained" disabled={busy !== null} onClick={() => void save()}>
          {busy === "save" ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
        </Button>
        <Button variant="outlined" disabled={busy !== null} onClick={() => void sendTest()}>
          {busy === "test" ? <CircularProgress size={20} /> : "Sinov xati yuborish"}
        </Button>
      </div>

      <p className="text-xs text-navy-300">
        Gmail bilan: host <code>smtp.gmail.com</code>, port <code>587</code>, foydalanuvchi — o&apos;sha
        Gmail manzili, parol — <b>App password</b> (Google akkaunt → Xavfsizlik → 2 bosqichli
        tasdiqlash → Ilova parollari). Oddiy parol ishlamaydi.
      </p>
    </div>
  );
}
