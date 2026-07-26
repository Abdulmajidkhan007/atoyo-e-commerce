"use client";

import { useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, TextField } from "@mui/material";
import CleaningServicesOutlinedIcon from "@mui/icons-material/CleaningServicesOutlined";

interface ResetResult {
  orders: number;
  reviews: number;
  products: number;
  stats: boolean;
  error?: string;
}

/**
 * TEST MA'LUMOTLARINI TOZALASH (faqat owner ko'radi). Sinov davridagi
 * buyurtmalar va statistika nolga tushadi; mahsulotlar, foydalanuvchilar,
 * blog va sozlamalarga tegilmaydi.
 */
export function ResetDemoData() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [orders, setOrders] = useState(true);
  const [reviews, setReviews] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/maintenance/reset-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm, orders, reviews, stats: true, salesCount: true }),
      });
      const data = (await res.json()) as ResetResult;
      if (!res.ok) throw new Error(data.error ?? "Tozalanmadi.");

      setMessage({
        type: "success",
        text: `Tozalandi: ${data.orders} buyurtma, ${data.reviews} sharh o'chirildi, ${data.products} mahsulot hisoblagichi nolga tushdi. Sahifani yangilang.`,
      });
      setConfirm("");
      setOpen(false);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Xatolik" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 rounded-xl2 border border-red-200 bg-red-50/50 p-4 dark:border-red-500/40 dark:bg-red-500/5">
      <h2 className="font-semibold text-navy-900 dark:text-white">Test ma&apos;lumotlarini tozalash</h2>
      <p className="mt-1 text-sm text-navy-300">
        Sinov davrida to&apos;plangan buyurtmalar va &quot;Jami buyurtmalar / Jami tushum&quot;
        ko&apos;rsatkichlarini nolga tushiradi. <b>Mahsulotlar, foydalanuvchilar, blog va
        sozlamalarga tegilmaydi.</b> Amalni orqaga qaytarib bo&apos;lmaydi.
      </p>

      {message && (
        <Alert severity={message.type} className="!mt-3">
          {message.text}
        </Alert>
      )}

      {!open ? (
        <Button
          color="error"
          variant="outlined"
          startIcon={<CleaningServicesOutlinedIcon />}
          className="!mt-3"
          onClick={() => setOpen(true)}
        >
          Tozalashni boshlash
        </Button>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <FormControlLabel
            control={<Checkbox checked={orders} onChange={(e) => setOrders(e.target.checked)} />}
            label="Barcha buyurtmalarni o'chirish"
          />
          <FormControlLabel
            control={<Checkbox checked={reviews} onChange={(e) => setReviews(e.target.checked)} />}
            label="Sharhlarni ham o'chirish"
          />
          <p className="text-sm text-navy-300">
            Tasdiqlash uchun quyidagi maydonga <b>TOZALASH</b> so&apos;zini yozing:
          </p>
          <TextField
            size="small"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.toUpperCase())}
            placeholder="TOZALASH"
            className="!max-w-60"
          />
          <div className="flex gap-2">
            <Button
              color="error"
              variant="contained"
              disabled={busy || confirm !== "TOZALASH"}
              onClick={run}
            >
              Tozalash
            </Button>
            <Button onClick={() => setOpen(false)} disabled={busy}>
              Bekor qilish
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
