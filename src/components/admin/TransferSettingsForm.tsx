"use client";

import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, FormControlLabel, Switch, TextField } from "@mui/material";
import { useChallenge } from "./ChallengeDialog";
import { DEFAULT_TRANSFER_SETTINGS, formatCardNumber, type TransferSettings } from "@/types/payment-transfer";

/**
 * KARTAGA O'TKAZMA — pul qabul qilinadigan karta.
 *
 * Saqlash JUMBOQ bilan (serverda tekshiriladi) va har o'zgarish
 * "Actions" topic'iga yoziladi: karta raqami — mijozlar puli boradigan
 * joy, uni begona odam almashtirsa pul unga ketadi.
 */
export function TransferSettingsForm() {
  const challenge = useChallenge();
  const [settings, setSettings] = useState<TransferSettings>(DEFAULT_TRANSFER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/transfer-settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { transfer?: TransferSettings } | null) => {
        if (!cancelled && data?.transfer) setSettings(data.transfer);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (patch: Partial<TransferSettings>) => setSettings((current) => ({ ...current, ...patch }));

  const save = async () => {
    setMessage(null);
    const answer = await challenge.ask();
    if (!answer) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/transfer-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, ...answer }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; transfer?: TransferSettings };
      if (!res.ok) throw new Error(body.error ?? "Saqlanmadi.");
      if (body.transfer) setSettings(body.transfer);
      setMessage({ kind: "success", text: "Saqlandi. Mijozlar bir daqiqada yangi ma'lumotni ko'radi." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress size={24} />;

  const digits = settings.cardNumber.replace(/\D/g, "");

  return (
    <div className="flex max-w-2xl flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
      <FormControlLabel
        control={<Switch checked={settings.enabled} onChange={(e) => update({ enabled: e.target.checked })} />}
        label="Kartaga o'tkazma yoqilgan (checkout va 1 klikda ko'rinadi)"
      />
      <TextField
        label="Karta raqami (16 ta raqam)"
        value={formatCardNumber(digits)}
        onChange={(e) => update({ cardNumber: e.target.value.replace(/\D/g, "").slice(0, 16) })}
        inputMode="numeric"
        size="small"
        error={digits.length > 0 && digits.length !== 16}
        helperText={digits.length > 0 && digits.length !== 16 ? `${digits.length}/16 raqam` : "Uzcard, Humo yoki Visa"}
      />
      <TextField
        label="Karta egasi (mijoz o'tkazishda shu ismni ko'radi)"
        value={settings.cardHolder}
        onChange={(e) => update({ cardHolder: e.target.value })}
        size="small"
      />
      <TextField
        label="Bank / tizim (ixtiyoriy)"
        placeholder="Masalan: Humo · Kapitalbank"
        value={settings.bankName}
        onChange={(e) => update({ bankName: e.target.value })}
        size="small"
      />
      <TextField
        label="Qo'shimcha izoh (ixtiyoriy)"
        placeholder="Masalan: Izohga buyurtma raqamini yozing."
        value={settings.note}
        onChange={(e) => update({ note: e.target.value })}
        size="small"
        multiline
        minRows={2}
      />
      <p className="text-xs text-navy-300">
        Mijoz buyurtma bergach shu karta va summani ko&apos;radi, pulni o&apos;tkazib chek yuklaydi. Chek
        &quot;Buyurtmalar&quot; topic&apos;iga keladi — bankda pul tushganini tekshirib, &quot;✅ To&apos;lov
        keldi&quot; ni bosasiz. Saqlashda jumboq so&apos;raladi; karta almashtirilsa &quot;Actions&quot;
        topic&apos;iga ogohlantirish tushadi.
      </p>
      {message && <Alert severity={message.kind}>{message.text}</Alert>}
      <div>
        <Button variant="contained" onClick={() => void save()} disabled={saving || challenge.loading}>
          {saving ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
        </Button>
      </div>
      {challenge.dialog}
    </div>
  );
}
