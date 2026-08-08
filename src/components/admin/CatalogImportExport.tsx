"use client";

import { useRef, useState } from "react";
import { Alert, Button, Checkbox, CircularProgress, FormControlLabel } from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import { fileToBase64 } from "@/lib/files/base64";

interface ImportResult {
  /** Import qilinganlar saytda ochiq holda yaratildimi. */
  published?: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  /** Import paytida avtomatik ochilgan yangi kategoriyalar. */
  newCategories?: string[];
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
  /**
   * Import qilinganlar DARHOL saytda ko'rinsinmi.
   *
   * Standart holatda YO'Q: katta narxnomada rasmsiz, kategoriyasi
   * chala mahsulotlar bo'ladi va ular katalogga tushsa sayt
   * ko'rimsiz bo'lib qoladi. Avval tartibga solinadi
   * (Katalog → Tartib), keyin "Saytda ochish" bilan ochiladi.
   */
  const [publish, setPublish] = useState(false);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);
    setError(null);
    try {
      // Excel faylini serverga base64 ko'rinishida yuboramiz (u yerda
      // o'qiladi), CSV esa matn sifatida - ikkalasi bir xil importga tushadi.
      const isExcel = /\.xlsx$/i.test(file.name);
      const payload = isExcel
        ? { xlsx: await fileToBase64(file), publish }
        : { csv: await file.text(), publish };

      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          CSV yoki Excel yuklash
        </Button>
        <FormControlLabel
          control={
            <Checkbox size="small" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
          }
          label={
            <span className="text-xs">
              Import qilinganlar <b>darhol saytda</b> ko&apos;rinsin
            </span>
          }
        />

        <input
          ref={fileInput}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          onChange={handleFile}
        />

        <Button
          component="a"
          href="/namuna/atoyo-mahsulotlar.xlsx"
          download
          variant="text"
          size="small"
          startIcon={<DownloadOutlinedIcon />}
        >
          Namuna Excel
        </Button>
        <Button component="a" href="/namuna/atoyo-mahsulotlar.csv" download variant="text" size="small">
          Namuna CSV
        </Button>

        <p className="text-xs text-navy-300">
          Fayldagi <code>id</code> ustuni to&apos;ldirilgan qatorlar mavjud mahsulotni yangilaydi, bo&apos;sh
          qatorlar yangi mahsulot yaratadi. Excel’da rasm bo&apos;lmaydi — <code>images</code> ustuniga
          rasm havolalarini yozing yoki rasmni keyin Telegram/admin panel orqali qo&apos;shing.
        </p>
        <p className="text-xs text-navy-300">
          <b>Turlari bor mahsulot</b> (o&apos;lcham/rang): har bir tur <b>alohida qator</b> bo&apos;ladi
          — nomi bir xil, <code>variantGroup</code> ustunida qator nomi (masalan{" "}
          <code>O&apos;lcham</code>), <code>variantValue</code> da qiymati (<code>50x60</code>),
          narx va zaxira esa o&apos;sha qatorning o&apos;zida. Ikkita qator kerak bo&apos;lsa{" "}
          <code>O&apos;lcham|Rang</code> va <code>50x60|Oq</code> deb yoziladi. Ustun nomlarini
          o&apos;zbekcha (<code>Nomi</code>, <code>Narxi</code>, <code>Zaxira</code>,{" "}
          <code>Turi</code>, <code>Razmer</code>) yozsangiz ham tushunadi.
        </p>
        <p className="text-xs text-navy-300">
          <b>Faqat nomlarni yaratmoqchi bo&apos;lsangiz</b> (narx/kategoriya keyin):{" "}
          <code>draft</code> ustuniga <code>1</code> qo&apos;ying va faqat <code>name</code> ni
          to&apos;ldiring. Bunday mahsulotlar <b>chernovik</b> bo&apos;ladi: saytda ko&apos;rinmaydi,
          kanalga e&apos;lon qilinmaydi va kirim sahifasida turadi — zaxira kelganda katalogga
          chiqadi.
        </p>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      {result && (
        <Alert severity={result.skipped > 0 ? "warning" : "success"}>
          {result.created} ta yangi, {result.updated} ta yangilandi
          {result.skipped > 0 && `, ${result.skipped} ta qator o'tkazib yuborildi`}.
          {result.published === false && (
            <div className="mt-1 text-xs">
              Ular <b>saytda hali ko&apos;rinmaydi</b>. Katalog → <b>Tartib</b> bo&apos;limida
              kategoriya yoki brend bo&apos;yicha filtrlab, rasm qo&apos;shib bo&apos;lgach
              &quot;Saytda ochish&quot; tugmasi bilan oching.
            </div>
          )}
          {(result.newCategories?.length ?? 0) > 0 && (
            <div className="mt-1 text-xs">
              Yangi kategoriyalar ochildi: {result.newCategories!.join(", ")}
            </div>
          )}
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
