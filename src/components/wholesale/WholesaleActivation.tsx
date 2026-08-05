"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Alert, Button, CircularProgress, TextField } from "@mui/material";
import { useAppSelector } from "@/redux/hooks";
import { ensureSessionCookie } from "@/lib/firebase/auth";

/**
 * OPTOM KIRISHNI FAOLLASHTIRISH.
 *
 * Mijoz avval oddiy hisobga kiradi (Google/Telegram/email), keyin shu
 * yerda telefon + kalitni kiritadi. Kalit havolada kelgan bo'lsa
 * (?kalit=ATY-...) maydon o'zi to'ladi.
 */
export function WholesaleActivation() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useAppSelector((state) => state.user.profile);
  const status = useAppSelector((state) => state.user.status);

  // Havoladagi kalit va profildagi telefon boshlang'ich qiymat sifatida
  // olinadi - effekt ichida setState qilinmaydi (React qoidasi).
  const [phone, setPhone] = useState(profile?.phoneNumber ?? "");
  const [accessKey, setAccessKey] = useState(
    (params.get("kalit") ?? params.get("key") ?? "").toUpperCase()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Profil keyinroq yuklansa telefonni bir marta to'ldiramiz.
  const [filledFrom, setFilledFrom] = useState<string | null>(null);
  if (profile?.phoneNumber && filledFrom !== profile.uid && !phone) {
    setFilledFrom(profile.uid);
    setPhone(profile.phoneNumber);
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Sessiya cookie'si eskirgan bo'lishi mumkin - avval yangilaymiz.
      await ensureSessionCookie();
      const res = await fetch("/api/wholesale/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), accessKey: accessKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Faollashtirilmadi.");
      setDone(data.shopName ?? "");
      // Rol o'zgardi - sahifani qayta yuklaymiz, narxlar optomga o'tadi.
      setTimeout(() => router.refresh(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") {
    return <CircularProgress size={24} />;
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
        <Alert severity="info">Avval hisobingizga kiring — keyin kalitni kiritasiz.</Alert>
        <Button component={Link} href="/kirish" variant="contained">
          Kirish
        </Button>
      </div>
    );
  }

  if (profile.role === "client") {
    return (
      <Alert severity="success">
        Hisobingiz optom mijoz sifatida faollashtirilgan — katalogda optom narxlar ko&apos;rinadi.
      </Alert>
    );
  }

  if (done !== null) {
    return (
      <Alert severity="success">
        Tayyor{done ? ` — ${done}` : ""}! Endi optom narxlarni ko&apos;rasiz.
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
      <TextField
        label="Telefon raqam"
        placeholder="90 123 45 67"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        required
      />
      <TextField
        label="Kalit"
        placeholder="ATY-7K3M-91QX"
        value={accessKey}
        onChange={(event) => setAccessKey(event.target.value.toUpperCase())}
        required
      />

      {error && <Alert severity="error">{error}</Alert>}

      <Button type="submit" variant="contained" size="large" disabled={busy}>
        {busy ? <CircularProgress size={22} color="inherit" /> : "Faollashtirish"}
      </Button>

      <p className="text-xs text-navy-300">
        Telefon raqam ro&apos;yxatdagi raqam bilan bir xil bo&apos;lishi kerak. Kalit boshqa
        hisobga biriktirilgan bo&apos;lsa ishlamaydi.
      </p>
    </form>
  );
}
