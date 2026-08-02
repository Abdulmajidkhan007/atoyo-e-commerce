"use client";

import { useState } from "react";
import { Alert, Button, CircularProgress } from "@mui/material";

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

/**
 * TIZIM TEKSHIRUVI paneli.
 *
 * "Push kelmadi", "Telegram orqali kirib bo'lmadi" kabi muammolarning
 * sababi serverda qoladi. Bu panel har bir bo'g'inni sinab ko'rib,
 * aniq xato matnini ko'rsatadi.
 */
export function DiagnosticsPanel() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [busy, setBusy] = useState<"run" | "push" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const runChecks = async () => {
    setBusy("run");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/diagnostics", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tekshirib bo'lmadi.");
      setChecks(data.checks as Check[]);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
    }
  };

  const sendTestPush = async () => {
    setBusy("push");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/diagnostics", { method: "PUT" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Yuborib bo'lmadi.");
      setMessage({
        kind: "ok",
        text: `Sinov bildirishnomasi ${data.devices} ta qurilmaga yuborildi. Telefoningizni tekshiring.`,
      });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
      <div className="flex flex-wrap gap-2">
        <Button variant="contained" onClick={runChecks} disabled={busy !== null}>
          {busy === "run" ? <CircularProgress size={20} /> : "Tekshirish"}
        </Button>
        <Button variant="outlined" onClick={sendTestPush} disabled={busy !== null}>
          {busy === "push" ? <CircularProgress size={20} /> : "Sinov bildirishnomasi"}
        </Button>
      </div>

      {message && <Alert severity={message.kind === "ok" ? "success" : "error"}>{message.text}</Alert>}

      {checks && (
        <ul className="flex flex-col gap-2">
          {checks.map((check) => (
            <li
              key={check.name}
              className="rounded-lg border border-navy-100 p-3 text-sm dark:border-navy-500"
            >
              <p className="font-medium text-navy-900 dark:text-white">
                {check.ok ? "✅" : "❌"} {check.name}
              </p>
              <p className={check.ok ? "text-navy-300" : "text-red-500"}>{check.detail}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-navy-300">
        Agar &laquo;custom token&raquo; yoki &laquo;FCM&raquo; qatorida xato chiqsa — hosting xizmat
        akkauntida huquq yetishmayapti. Google Cloud Shell&apos;da bitta buyruq bilan hal bo&apos;ladi
        (tartib <code>docs/DEPLOY.md</code> da, &laquo;Xizmat akkaunti huquqlari&raquo; bo&apos;limi).
      </p>
    </div>
  );
}
