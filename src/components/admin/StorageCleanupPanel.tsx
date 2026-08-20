"use client";

import { useState } from "react";
import { Alert, Button, CircularProgress, TextField } from "@mui/material";

interface OrphanSample {
  path: string;
  bytes: number;
  createdAt: number;
}

interface ScanResult {
  scanned: number;
  referenced: number;
  tooNew: number;
  count: number;
  bytes: number;
  sample: OrphanSample[];
}

function mb(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * STORAGE TOZALASH PANELI.
 *
 * Mahsulotdan olib tashlangan rasm/video Storage'da qoladi (savatdan
 * tiklashda kerak bo'lishi mumkin) va joy egallaydi. Bu panel qaysi
 * fayllar endi HECH QAYERDA ishlatilmayotganini ko'rsatadi va
 * tasdiqdan keyin ularni o'chiradi.
 *
 * Ikki bosqich ataylab: avval "Tekshirish" (hech narsa o'chmaydi),
 * keyin tasdiq so'zi bilan "O'chirish".
 */
export function StorageCleanupPanel() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"scan" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const scan = async () => {
    setBusy("scan");
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/admin/maintenance/storage");
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Xatolik.");
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch("/api/admin/maintenance/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Xatolik.");
      setDone(`${data.deleted} ta fayl o'chirildi (${mb(data.bytes ?? 0)} bo'shadi).`);
      setResult(null);
      setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
      <p className="text-sm text-navy-300">
        Mahsulotdan olib tashlangan rasm va video Storage&apos;da <b>qoladi</b> — o&apos;chirilgan
        mahsulot 30 kunlik savatdan tiklanganda rasmlari joyida bo&apos;lishi kerak. Vaqt
        o&apos;tib bu fayllar joy egallaydi. Bu yerdan ular topiladi va tozalanadi.
        Faqat <b>30 kundan eski</b> va hech qaysi mahsulot/maqola/buyurtmada ishlatilmayotgan
        fayllar o&apos;chadi.
      </p>

      <div>
        <Button variant="outlined" onClick={scan} disabled={busy !== null}>
          {busy === "scan" ? <CircularProgress size={20} /> : "Tekshirish"}
        </Button>
      </div>

      {done && <Alert severity="success">{done}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <div className="flex flex-col gap-3">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              Storage&apos;dagi fayllar: <b>{result.scanned}</b>
            </div>
            <div>
              Bazada ishlatilayotgan havolalar: <b>{result.referenced}</b>
            </div>
            <div>
              Yetim fayllar: <b>{result.count}</b>
            </div>
            <div>
              Bo&apos;shaydigan joy: <b>{mb(result.bytes)}</b>
            </div>
          </div>

          {result.tooNew > 0 && (
            <p className="text-xs text-navy-300">
              {result.tooNew} ta fayl yaqinda yuklangani uchun tegilmadi (30 kundan yosh).
            </p>
          )}

          {result.count === 0 ? (
            <Alert severity="success">Tozalanadigan fayl yo&apos;q — hammasi ishlatilyapti.</Alert>
          ) : (
            <>
              <div className="max-h-48 overflow-auto rounded-lg bg-navy-50 p-3 text-xs dark:bg-navy-900">
                {result.sample.map((file) => (
                  <div key={file.path} className="truncate">
                    {file.path} — {mb(file.bytes)}
                  </div>
                ))}
                {result.count > result.sample.length && (
                  <div className="mt-1 text-navy-300">
                    …va yana {result.count - result.sample.length} ta
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <TextField
                  size="small"
                  label="Tasdiq so'zi"
                  placeholder="TOZALASH"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <Button
                  variant="contained"
                  color="error"
                  onClick={remove}
                  disabled={confirm !== "TOZALASH" || busy !== null}
                >
                  {busy === "delete" ? <CircularProgress size={20} color="inherit" /> : "O'chirish"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
