"use client";

import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, FormControlLabel, Switch, TextField } from "@mui/material";

/**
 * ILOVA YANGILANISHI.
 *
 * Android ilovasi Play Market'da emas — APK to'g'ridan-to'g'ri yuklab
 * olinadi, ya'ni telefon uni O'ZI yangilamaydi va foydalanuvchi yangi
 * versiya chiqqanini bilmaydi. Shu yerda versiya raqami va "nima
 * o'zgardi" ro'yxati yoziladi:
 *
 *   • ilova ochilganda shu ma'lumot bilan oyna chiqadi va bir bosishda
 *     APK yuklanadi;
 *   • "Bildirishnoma yuborish" belgilansa — ilovani ochmagan
 *     foydalanuvchilarga ham push ketadi.
 */

interface AppUpdate {
  version: string;
  notes: string[];
  apkUrl: string;
  mandatory: boolean;
  updatedAt: number;
}

export function AppUpdateForm() {
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [apkUrl, setApkUrl] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const apply = (update: AppUpdate) => {
    setVersion(update.version);
    setNotes(update.notes.join("\n"));
    setApkUrl(update.apkUrl);
    setMandatory(update.mandatory);
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/app-update")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { update?: AppUpdate } | null) => {
        if (!cancelled && data?.update) apply(data.update);
      })
      .catch(() => {})
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
      const res = await fetch("/api/admin/app-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: version.trim(),
          notes: notes
            .split("\n")
            .map((line) => line.replace(/^[-•*]\s*/, "").trim())
            .filter(Boolean),
          apkUrl: apkUrl.trim(),
          mandatory,
          notify,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        update?: AppUpdate;
        notified?: boolean;
        error?: string;
      };
      if (!res.ok || !data.update) throw new Error(data.error ?? "Saqlanmadi.");
      apply(data.update);
      setMessage({
        kind: "ok",
        text: data.notified
          ? "Saqlandi va bildirishnoma yuborildi."
          : "Saqlandi. Ilova ochilganda foydalanuvchi eslatma ko'radi.",
      });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <CircularProgress size={22} />
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <TextField
        size="small"
        label="Versiya"
        placeholder="1.1"
        value={version}
        onChange={(event) => setVersion(event.target.value)}
        helperText="Ilovadagi versiya (mobile/android/app/build.gradle → versionName) bilan bir xil bo'lsin."
        className="!w-44"
      />

      <TextField
        size="small"
        label="Nima o'zgardi (har qatori alohida band)"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        multiline
        minRows={3}
        placeholder={"Rang tanlash tugmalari tuzatildi\nMahsulot kodi ko'rinadigan bo'ldi"}
        helperText="Foydalanuvchi shu ro'yxatni yangilanish oynasida ko'radi. 10 tagacha band."
        fullWidth
      />

      <TextField
        size="small"
        label="APK havolasi"
        value={apkUrl}
        onChange={(event) => setApkUrl(event.target.value)}
        helperText="Bo'sh qoldirilsa GitHub'dagi oxirgi reliz havolasi ishlatiladi."
        fullWidth
      />

      <FormControlLabel
        control={<Switch checked={mandatory} onChange={(event) => setMandatory(event.target.checked)} />}
        label="Majburiy yangilanish (oynani yopib bo'lmaydi)"
      />
      <FormControlLabel
        control={<Switch checked={notify} onChange={(event) => setNotify(event.target.checked)} />}
        label="Saqlagach bildirishnoma yuborilsin"
      />

      <Button variant="contained" onClick={save} disabled={saving || !version.trim()} className="!w-fit">
        {saving ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
      </Button>

      {message && <Alert severity={message.kind === "ok" ? "success" : "error"}>{message.text}</Alert>}
    </div>
  );
}
