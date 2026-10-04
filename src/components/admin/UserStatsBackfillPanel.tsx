"use client";

import { useState } from "react";
import { Alert, Button, CircularProgress } from "@mui/material";

/**
 * FOYDALANUVCHI STATISTIKASINI TO'LDIRISH (bir martalik).
 *
 * Buyurtmalar soni/summasi endi foydalanuvchi hujjatida yuritiladi
 * (`lib/orders/user-stats.ts`) - admin ro'yxati har foydalanuvchi uchun
 * alohida so'rov yubormaydi. Eski buyurtmalar esa hali hisobga kirmagan:
 * shu tugma ularni bir marta hisoblab yozadi.
 *
 * Nega alohida tugma: route `POST` bo'lgani uchun manzilni brauzerda
 * ochib bo'lmaydi (`OrderCostsMigrationPanel` bilan bir xil naqsh).
 */
export function UserStatsBackfillPanel() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/admin/maintenance/user-stats", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Xatolik.");
      setDone(
        `${data.ordersScanned} ta buyurtma ko'rildi, ${data.usersUpdated} ta foydalanuvchi yangilandi ` +
          `(${data.usersWithOrders} tasida buyurtma bor).`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
      <p className="text-sm text-navy-300">
        &quot;Foydalanuvchilar&quot; ro&apos;yxatidagi buyurtmalar soni va summasi endi foydalanuvchi
        hujjatida saqlanadi. Eski buyurtmalarni hisobga kiritish uchun bir marta bosing. Takror
        bosilsa zarari yo&apos;q — qiymatlar qaytadan hisoblanadi. Bekor qilingan buyurtma soniga
        va summasiga kirmaydi.
      </p>
      <div>
        <Button variant="outlined" onClick={run} disabled={busy}>
          {busy ? <CircularProgress size={20} /> : "Statistikani to'ldirish"}
        </Button>
      </div>
      {done && <Alert severity="success">{done}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
    </div>
  );
}
