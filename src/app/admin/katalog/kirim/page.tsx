"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, TextField, CircularProgress, Alert, IconButton, Snackbar } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { searchProductsByPrefix } from "@/lib/firebase/firestore";
import { SearchBar } from "@/components/product/SearchBar";
import { IntakeHistoryList } from "@/components/admin/IntakeHistoryList";
import type { Product } from "@/types/product";
import type { StockIntake } from "@/types/intake";

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

interface IntakeRow {
  productId: string;
  name: string;
  currentStock: number;
  qty: number;
  price: string; // bo'sh = o'zgarmasin
  supplier: string;
}

/**
 * MAHSULOT KIRIMI sahifasi: yangi partiya kelganda avval MAVJUD mahsulot
 * qidiriladi - topilsa ro'yxatga qo'shilib zaxira ko'paytiriladi; topilmasa
 * "Yangi mahsulot yaratish" sahifasiga o'tiladi. Bir kirimda bir nechta
 * mahsulotni ro'yxat qilib birdaniga saqlash mumkin.
 */
function IntakeContent() {
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(
    searchParams.get("yaratildi") ? "✅ Yangi mahsulot yaratildi va katalogga qo'shildi." : null
  );
  const [recent, setRecent] = useState<StockIntake[] | null>(null);

  /** So'nggi kirimlar - kim, qachon, qayerdan kiritgani ko'rinib turadi. */
  const loadRecent = () => {
    fetch("/api/admin/products/intake")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { intakes?: StockIntake[] } | null) => setRecent(data?.intakes ?? []))
      .catch(() => setRecent([]));
  };

  useEffect(() => {
    let active = true;
    fetch("/api/admin/products/intake")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { intakes?: StockIntake[] } | null) => {
        if (active) setRecent(data?.intakes ?? []);
      })
      .catch(() => {
        if (active) setRecent([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const trimmed = searchTerm.trim();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!trimmed) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const found = await searchProductsByPrefix(trimmed, 8);
        if (!cancelled) setResults(found);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }
    const timer = setTimeout(run, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  const addRow = (p: Product) => {
    setRows((prev) =>
      prev.some((r) => r.productId === p.id)
        ? prev
        : [...prev, { productId: p.id, name: p.name, currentStock: p.stock, qty: 1, price: "", supplier: p.supplier ?? "" }]
    );
    setSearchTerm("");
    setResults([]);
  };

  const updateRow = (productId: string, patch: Partial<IntakeRow>) => {
    setRows((prev) => prev.map((r) => (r.productId === productId ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/products/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: rows.map((r) => ({
            productId: r.productId,
            qty: r.qty,
            ...(r.price.trim() ? { price: Number(r.price) } : {}),
            ...(r.supplier.trim() ? { supplier: r.supplier.trim() } : {}),
          })),
        }),
      });
      if (!res.ok) throw new Error("failed");
      setToast(`✅ Kirim saqlandi: ${rows.length} ta mahsulot zaxirasi yangilandi.`);
      setRows([]);
      loadRecent();
    } catch {
      setToast("❌ Kirimni saqlashda xatolik. Qayta urinib ko'ring.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Mahsulot kirimi</h1>
        <Link href="/admin/katalog/kirim/tarix" className="text-sm text-aqua-600 hover:underline">
          Kirim tarixi →
        </Link>
      </div>
      <p className="mb-6 text-sm text-navy-300">
        Avval mahsulotni qidiring — topilsa ro&apos;yxatga qo&apos;shib zaxirani ko&apos;paytiring.
        Topilmasa yangi mahsulot yarating.
      </p>

      {/* 1) Qidiruv */}
      <div className="rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Mahsulot nomini yozing..." />

        {isSearching && (
          <div className="flex justify-center py-4">
            <CircularProgress size={22} />
          </div>
        )}

        {!isSearching && trimmed && (
          <div className="mt-3 flex flex-col gap-2">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addRow(p)}
                className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-left text-sm hover:border-aqua-500 dark:border-navy-500"
              >
                <span className="line-clamp-1 font-medium text-navy-900 dark:text-white">{p.name}</span>
                <span className="ml-2 shrink-0 text-navy-300">
                  {formatSom(p.price)} • zaxira: {p.stock}
                </span>
              </button>
            ))}

            {results.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <p className="text-sm text-navy-300">&quot;{trimmed}&quot; topilmadi — bu yangi mahsulot.</p>
                <Button
                  component={Link}
                  href={`/admin/katalog/yangi?nom=${encodeURIComponent(trimmed)}`}
                  variant="contained"
                  startIcon={<AddIcon />}
                >
                  Yangi mahsulot yaratish
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2) Kirim ro'yxati */}
      {rows.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">Kirim ro&apos;yxati ({rows.length})</h2>
          {rows.map((row) => (
            <div key={row.productId} className="rounded-xl2 border border-navy-100 bg-white p-3 dark:border-navy-500 dark:bg-navy-700">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="line-clamp-1 font-medium text-navy-900 dark:text-white">{row.name}</p>
                <IconButton size="small" aria-label="O'chirish" onClick={() => setRows((prev) => prev.filter((r) => r.productId !== row.productId))}>
                  <DeleteOutlineIcon fontSize="small" className="text-red-400" />
                </IconButton>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <TextField
                  size="small"
                  type="number"
                  label="Kelgan soni"
                  value={row.qty}
                  onChange={(e) => updateRow(row.productId, { qty: Math.max(1, Number(e.target.value) || 1) })}
                />
                <TextField size="small" label="Hozirgi zaxira" value={`${row.currentStock} → ${row.currentStock + row.qty}`} disabled />
                <TextField
                  size="small"
                  type="number"
                  label="Yangi narx (ixtiyoriy)"
                  value={row.price}
                  onChange={(e) => updateRow(row.productId, { price: e.target.value })}
                />
                <TextField
                  size="small"
                  label="Kimdan kelgan"
                  value={row.supplier}
                  onChange={(e) => updateRow(row.productId, { supplier: e.target.value })}
                />
              </div>
            </div>
          ))}

          <div>
            <Button variant="contained" size="large" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <CircularProgress size={22} color="inherit" /> : `Kirimni saqlash (${rows.length})`}
            </Button>
          </div>
        </div>
      )}

      {/* 3) So'nggi kirimlar - qayerdan, kim, qachon */}
      <div className="mt-8 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-navy-900 dark:text-white">So&apos;nggi kirimlar</h2>
          <Link href="/admin/katalog/kirim/tarix" className="text-sm text-aqua-600 hover:underline">
            Hammasi →
          </Link>
        </div>

        {recent === null ? (
          <div className="flex justify-center py-4">
            <CircularProgress size={22} />
          </div>
        ) : (
          <IntakeHistoryList intakes={recent} />
        )}
      </div>

      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.startsWith("❌") ? "error" : "success"} variant="filled" onClose={() => setToast(null)}>
            {toast}
          </Alert>
        ) : undefined}
      </Snackbar>
    </div>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={null}>
      <IntakeContent />
    </Suspense>
  );
}
