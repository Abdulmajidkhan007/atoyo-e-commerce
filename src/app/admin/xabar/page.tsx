"use client";

import { useState } from "react";
import { TextField, Button, Alert, CircularProgress, FormControlLabel, Checkbox } from "@mui/material";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";

/**
 * FOYDALANUVCHILARGA XABAR YUBORISH: sarlavha + matn kiritiladi, tanlangan
 * kanallar bo'yicha barcha foydalanuvchilarga boradi - bot mijozlariga
 * Telegram DM, sayt foydalanuvchilari/obunachilarga email.
 * Telegramdagi /elon buyrug'i ham xuddi shu ishni qiladi.
 */
export default function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [viaTelegram, setViaTelegram] = useState(true);
  const [viaEmail, setViaEmail] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setResult(null);
    setIsError(false);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), viaTelegram, viaEmail }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setResult(
        `✅ Yuborildi — Telegram: ${data.telegramSent} ta, Email: ${data.emailSent} ta.` +
          // Email ketmagan bo'lsa sababi aytiladi (SMTP yo'q, manzil yo'q...).
          (data.emailNote ? ` ${data.emailNote}` : "")
      );
      setTitle("");
      setBody("");
    } catch {
      setIsError(true);
      setResult("Yuborishda xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold text-navy-900 dark:text-white">
        <CampaignOutlinedIcon className="text-aqua-500" /> Xabar yuborish
      </h1>
      <p className="mb-6 text-sm text-navy-300">
        E&apos;lon barcha foydalanuvchilarga boradi: bot mijozlariga Telegram orqali,
        sayt foydalanuvchilari va obunachilarga email orqali.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <TextField label="Sarlavha" required value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
        <TextField
          label="Xabar matni"
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          multiline
          minRows={5}
          fullWidth
        />

        <div className="flex flex-wrap gap-4">
          <FormControlLabel
            control={<Checkbox checked={viaTelegram} onChange={(e) => setViaTelegram(e.target.checked)} />}
            label="📱 Telegram (bot mijozlari)"
          />
          <FormControlLabel
            control={<Checkbox checked={viaEmail} onChange={(e) => setViaEmail(e.target.checked)} />}
            label="✉️ Email (sayt + obunachilar)"
          />
        </div>

        {result && <Alert severity={isError ? "error" : "success"}>{result}</Alert>}

        <div>
          <Button type="submit" variant="contained" size="large" disabled={isSending || (!viaTelegram && !viaEmail)}>
            {isSending ? <CircularProgress size={22} color="inherit" /> : "Yuborish"}
          </Button>
        </div>
      </form>
    </div>
  );
}
