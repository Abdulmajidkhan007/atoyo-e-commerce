"use client";

import { useState } from "react";
import { Alert, Button, CircularProgress } from "@mui/material";

/**
 * ESKI BUYURTMALARDAGI TANNARXNI KO'CHIRISH (bir martalik).
 *
 * Tannarx endi buyurtma hujjatida emas, yopiq `orderCosts/{orderId}`
 * da saqlanadi (`lib/orders/create-order.ts`) — mijoz o'z
 * buyurtmasini client SDK bilan o'qigani uchun u yerda tannarx
 * turishi mumkin emas edi. Eski buyurtmalar esa hali eski
 * ko'rinishda: shu tugma ularni bir marta ko'chiradi.
 *
 * Nega alohida tugma: route `POST` bo'lgani uchun manzilni brauzerda
 * ochib bo'lmaydi (bo'sh sahifa chiqadi).
 */
export function OrderCostsMigrationPanel() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/admin/maintenance/order-costs", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Xatolik.");
      setDone(
        data.migrated > 0
          ? `${data.scanned} ta buyurtma ko'rildi, ${data.migrated} tasidan tannarx ko'chirildi.`
          : `${data.scanned} ta buyurtma ko'rildi — ko'chiriladigan tannarx qolmagan.`
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
        Tannarx endi buyurtma hujjatida saqlanmaydi — u yopiq <code>orderCosts</code> ga
        yoziladi, chunki mijoz o&apos;z buyurtmasini brauzerdan o&apos;qiy oladi. Eski
        buyurtmalarni bir marta shu tugma bilan o&apos;tkazing. Takror bosilsa zarari yo&apos;q —
        ko&apos;chirilganlari qayta tegilmaydi.
      </p>
      <div>
        <Button variant="outlined" onClick={run} disabled={busy}>
          {busy ? <CircularProgress size={20} /> : "Tannarxni ko'chirish"}
        </Button>
      </div>
      {done && <Alert severity="success">{done}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
    </div>
  );
}
