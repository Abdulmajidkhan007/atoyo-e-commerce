"use client";

import { useRef, useState } from "react";
import { Alert, Button, CircularProgress } from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Katalogni CSV orqali yuklab olish va yuklash. Import faylida `id`
 * ustuni to'ldirilgan qatorlar mavjud mahsulotni yangilaydi.
 */
export function CatalogImportExport() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);
    setError(null);
    try {
      const csv = await file.text();
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = (await res.json()) as ImportResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Import bajarilmadi.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-800">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          component="a"
          href="/api/admin/products/export"
          variant="outlined"
          startIcon={<DownloadOutlinedIcon />}
        >
          CSV yuklab olish
        </Button>

        <Button
          variant="outlined"
          startIcon={importing ? <CircularProgress size={18} /> : <UploadFileOutlinedIcon />}
          disabled={importing}
          onClick={() => fileInput.current?.click()}
        >
          CSV dan yuklash
        </Button>
        <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={handleFile} />

        <p className="text-xs text-navy-300">
          Fayldagi <code>id</code> ustuni to&apos;ldirilgan qatorlar mavjud mahsulotni yangilaydi, bo&apos;sh
          qatorlar yangi mahsulot yaratadi.
        </p>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <Alert severity={result.skipped > 0 ? "warning" : "success"}>
          {result.created} ta yangi, {result.updated} ta yangilandi
          {result.skipped > 0 && `, ${result.skipped} ta qator o'tkazib yuborildi`}.
          {result.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {result.errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}
    </div>
  );
}
