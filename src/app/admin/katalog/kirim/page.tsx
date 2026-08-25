"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, TextField, CircularProgress, Alert, IconButton, Snackbar, MenuItem } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { SearchBar } from "@/components/product/SearchBar";
import { IntakeHistoryList } from "@/components/admin/IntakeHistoryList";
import { ZeroStockIntake } from "@/components/admin/ZeroStockIntake";
import { variantLabel } from "@/lib/products/variants";
import type { Product } from "@/types/product";
import type { StockIntake } from "@/types/intake";
import { formatSom } from "@/lib/format";

interface IntakeRow {
  productId: string;
  name: string;
  currentStock: number;
  qty: number;
  price: string; // bo'sh = o'zgarmasin
  supplier: string;
  /** Chernovik - kirim saqlanganda katalogga chiqadi va kanalga e'lon qilinadi. */
  isDraft?: boolean;
  /** Turlari (o'lcham/rang) bo'lgan mahsulotda - qaysi turga kirim. */
  variants?: { id: string; label: string }[];
  variantId?: string;
}

/** Mahsulotning turlari ro'yxati (kirimda tanlash uchun). */
function variantOptions(product: Product): { id: string; label: string }[] {
  return (product.variants ?? []).map((variant) => ({
    id: variant.id,
    label: variantLabel(product, variant) || variant.id,
  }));
}

/**
 * Admin qidiruvi: saytdagi ochiq qidiruvdan farqli o'laroq CHERNOVIK
 * mahsulotlar ham topiladi (ular hali katalogda ko'rinmaydi).
 */
async function searchForIntake(term: string): Promise<Product[]> {
  const res = await fetch(`/api/admin/products/search?q=${encodeURIComponent(term)}`);
  if (!res.ok) return [];
  return ((await res.json()) as { products?: Product[] }).products ?? [];
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
  /** Butun kirim bitta kishidan bo'lsa - hammasiga shu yoziladi. */
  const [commonSupplier, setCommonSupplier] = useState("");
  /** Ro'yxat bilan qo'shish (bir nechta mahsulotni bittada). */
  const [bulkText, setBulkText] = useState("");
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [bulkReport, setBulkReport] = useState<string[]>([]);
  const draftId = searchParams.get("chernovik");
  const [toast, setToast] = useState<string | null>(
    searchParams.get("yaratildi")
      ? "✅ Yangi mahsulot yaratildi va katalogga qo'shildi."
      : draftId
        ? "📝 Mahsulot ochildi. Endi kelgan sonini kiritib, kirimni saqlang — shundan keyin katalogga chiqadi."
        : null
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

  /** Yangi ochilgan chernovik darhol kirim ro'yxatiga tushadi. */
  useEffect(() => {
    if (!draftId) return;
    let active = true;
    fetch(`/api/admin/products/search?id=${encodeURIComponent(draftId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { products?: Product[] } | null) => {
        const product = data?.products?.[0];
        if (!active || !product) return;
        setRows((prev) =>
          prev.some((r) => r.productId === product.id)
            ? prev
            : [
                ...prev,
                {
                  productId: product.id,
                  name: product.name,
                  currentStock: product.stock,
                  qty: 1,
                  price: "",
                  supplier: product.supplier ?? "",
                  isDraft: product.isDraft === true,
                  variants: variantOptions(product),
                  variantId: variantOptions(product)[0]?.id,
                },
              ]
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [draftId]);

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
        const found = await searchForIntake(trimmed);
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
        : [
            ...prev,
            {
              productId: p.id,
              name: p.name,
              currentStock: p.stock,
              qty: 1,
              price: "",
              supplier: p.supplier ?? "",
              isDraft: p.isDraft === true,
              variants: variantOptions(p),
              variantId: variantOptions(p)[0]?.id,
            },
          ]
    );
    setSearchTerm("");
    setResults([]);
  };

  const updateRow = (productId: string, patch: Partial<IntakeRow>) => {
    setRows((prev) => prev.map((r) => (r.productId === productId ? { ...r, ...patch } : r)));
  };

  /**
   * RO'YXAT BILAN QO'SHISH: bir kishidan 10 ta ham, 1000 ta ham tovar
   * kelganda ularni bittalab qidirib o'tirmaslik uchun ro'yxatni
   * ko'chirib qo'yiladi. Har bir qator:
   *
   *   nomi yoki № | soni | narxi(ixtiyoriy)
   *
   * Har bir qator uchun mahsulot qidiriladi (raqam bo'yicha ham),
   * topilganlari kirim ro'yxatiga tushadi, topilmaganlari hisobotda
   * ko'rsatiladi - ularni "Yangi mahsulot ochish" bilan ochasiz.
   */
  const applyBulk = async () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 1000);
    if (lines.length === 0) return;

    setIsBulkBusy(true);
    const report: string[] = [];
    const found: IntakeRow[] = [];

    for (const line of lines) {
      const [nameRaw, qtyRaw, priceRaw] = line.split(/[|;\t]/).map((part) => (part ?? "").trim());
      const key = (nameRaw ?? "").trim();
      if (!key) continue;

      const results = await searchForIntake(key).catch(() => [] as Product[]);
      // Aniq mos kelgani (nomi yoki raqami) birinchi o'ringa chiqadi.
      const exact =
        results.find((p) => p.name.toLowerCase() === key.toLowerCase()) ??
        results.find((p) => String(p.code ?? "") === key) ??
        results[0];

      if (!exact) {
        report.push(`❌ "${key}" topilmadi`);
        continue;
      }
      if (results.length > 1 && !results.some((p) => p.name.toLowerCase() === key.toLowerCase())) {
        report.push(`⚠️ "${key}" — "${exact.name}" deb olindi (bir nechta mos keldi)`);
      }

      const qty = Math.max(1, Math.round(Number((qtyRaw ?? "").replace(/\s/g, "")) || 1));
      found.push({
        productId: exact.id,
        name: exact.name,
        currentStock: exact.stock,
        qty,
        price: priceRaw && !Number.isNaN(Number(priceRaw)) ? String(Number(priceRaw)) : "",
        supplier: commonSupplier.trim(),
        isDraft: exact.isDraft === true,
        variants: variantOptions(exact),
        variantId: variantOptions(exact)[0]?.id,
      });
    }

    setRows((prev) => {
      const merged = [...prev];
      for (const row of found) {
        const existing = merged.find((r) => r.productId === row.productId);
        if (existing) existing.qty += row.qty;
        else merged.push(row);
      }
      return merged;
    });
    report.unshift(`✅ ${found.length} ta qator qo'shildi`);
    setBulkReport(report);
    setBulkText("");
    setIsBulkBusy(false);
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
            ...(r.variantId ? { variantId: r.variantId } : {}),
            qty: r.qty,
            ...(r.price.trim() ? { price: Number(r.price) } : {}),
            ...((r.supplier.trim() || commonSupplier.trim())
              ? { supplier: (r.supplier.trim() || commonSupplier.trim()) }
              : {}),
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Kirimni saqlashda xatolik.");
      }
      const published = rows.filter((r) => r.isDraft).length;
      setToast(
        published > 0
          ? `✅ Kirim saqlandi: ${rows.length} ta mahsulot zaxirasi yangilandi. ${published} ta yangi mahsulot katalogga chiqdi va kanalga e'lon qilindi.`
          : `✅ Kirim saqlandi: ${rows.length} ta mahsulot zaxirasi yangilandi.`
      );
      setRows([]);
      loadRecent();
    } catch (e) {
      setToast(`❌ ${e instanceof Error ? e.message : "Kirimni saqlashda xatolik."}`);
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
      <p className="mb-4 text-sm text-navy-300">
        Avval mahsulotni qidiring — topilsa ro&apos;yxatga qo&apos;shib zaxirani ko&apos;paytiring.
        Topilmasa &quot;Yangi mahsulot ochish&quot; bilan mahsulot ta&apos;rifini yarating: u shu
        yerda paydo bo&apos;ladi va kelgan soni kiritilgach katalogga chiqadi.
      </p>

      {/* Har doim ko'rinadigan tugmalar */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          component={Link}
          href="/admin/katalog/yangi?chernovik=1"
          variant="outlined"
          startIcon={<AddIcon />}
        >
          Yangi mahsulot ochish
        </Button>
        <Button variant="outlined" startIcon={<PlaylistAddIcon />} onClick={() => setIsBulkOpen((v) => !v)}>
          Ro&apos;yxat bilan qo&apos;shish
        </Button>
      </div>

      {/*
        ZAXIRASIZ MAHSULOTLAR: Excel bilan yaratilgan minglab mahsulotni
        bir yo'la zaxiraga olish uchun tayyor ro'yxat.
      */}
      <div className="mb-4">
        <ZeroStockIntake supplier={commonSupplier} onSaved={loadRecent} />
      </div>

      {/* Butun kirim bitta kishidan bo'lsa - bir marta yoziladi. */}
      <div className="mb-4">
        <TextField
          size="small"
          label="Kimdan kelgan (butun kirim uchun)"
          placeholder="Masalan: Akmal aka"
          value={commonSupplier}
          onChange={(e) => setCommonSupplier(e.target.value)}
          helperText="Qatorlarda alohida yozilmagan bo'lsa shu ishlatiladi"
          fullWidth
        />
      </div>

      {/* RO'YXAT BILAN: bir kishidan kelgan o'nlab-yuzlab tovarni bittada */}
      {isBulkOpen && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700">
          <div>
            <h2 className="font-semibold text-navy-900 dark:text-white">Ro&apos;yxat bilan qo&apos;shish</h2>
            <p className="mt-1 text-xs text-navy-300">
              Har bir qator bitta mahsulot: <code>nomi yoki № | soni | narxi</code>. Narx ixtiyoriy.
              Excel/Google Sheets dan ustunlarni ko&apos;chirib qo&apos;ysangiz ham bo&apos;ladi.
            </p>
          </div>

          <TextField
            multiline
            minRows={5}
            placeholder={"PPR quvur 25mm | 120 | 45000\n12 | 30\nBoou dush 8276 | 5"}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            fullWidth
          />

          <div className="flex items-center gap-2">
            <Button variant="contained" onClick={applyBulk} disabled={isBulkBusy || !bulkText.trim()}>
              {isBulkBusy ? <CircularProgress size={20} color="inherit" /> : "Ro'yxatni qo'shish"}
            </Button>
            <span className="text-xs text-navy-300">
              Topilmagan mahsulotlarni keyin &quot;Yangi mahsulot ochish&quot; bilan ochasiz.
            </span>
          </div>

          {bulkReport.length > 0 && (
            <ul className="flex flex-col gap-0.5 text-xs text-navy-300">
              {bulkReport.slice(0, 30).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
              {bulkReport.length > 30 && <li>... yana {bulkReport.length - 30} ta</li>}
            </ul>
          )}
        </div>
      )}

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
                <span className="line-clamp-1 font-medium text-navy-900 dark:text-white">
                  {p.name}
                  {p.isDraft && (
                    <span className="ml-2 rounded bg-aqua-500/15 px-1.5 py-0.5 text-xs text-aqua-600">
                      chernovik
                    </span>
                  )}
                </span>
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
                  href={`/admin/katalog/yangi?chernovik=1&nom=${encodeURIComponent(trimmed)}`}
                  variant="contained"
                  startIcon={<AddIcon />}
                >
                  Yangi mahsulot ochish
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2) Kirim ro'yxati */}
      {rows.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold text-navy-900 dark:text-white">
              Kirim ro&apos;yxati ({rows.length})
            </h2>
            <p className="mt-1 text-xs text-navy-300">
              Mahsulotning hamma ma&apos;lumoti to&apos;g&apos;ri bo&apos;lsa — shunchaki sonini
              yozib saqlang. Bir joyi noto&apos;g&apos;ri bo&apos;lsa ✏️ tugmasi bilan
              tahrirlang, saqlagandan keyin shu sahifaga qaytasiz.
            </p>
          </div>
          {rows.map((row) => (
            <div key={row.productId} className="rounded-xl2 border border-navy-100 bg-white p-3 dark:border-navy-500 dark:bg-navy-700">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="line-clamp-1 font-medium text-navy-900 dark:text-white">
                  {row.name}
                  {row.isDraft && (
                    <span className="ml-2 rounded bg-aqua-500/15 px-1.5 py-0.5 text-xs text-aqua-600">
                      chernovik → katalogga chiqadi
                    </span>
                  )}
                </p>
                <div className="flex shrink-0 items-center">
                  {/* MAVJUD MAHSULOT: hammasi joyida bo'lsa shunchaki
                      kirim qilinadi. Nomi/narxi/rasmi to'g'rilanishi
                      kerak bo'lsa - shu tugma tahrirga olib boradi va
                      saqlangach AYNAN shu kirim sahifasiga qaytaradi. */}
                  <IconButton
                    size="small"
                    aria-label="Mahsulotni tahrirlash"
                    title="Mahsulotni tahrirlash (nomi, narxi, rasmi)"
                    component={Link}
                    href={`/admin/katalog/${row.productId}/tahrir?qayt=${encodeURIComponent("/admin/katalog/kirim")}`}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" aria-label="O'chirish" onClick={() => setRows((prev) => prev.filter((r) => r.productId !== row.productId))}>
                    <DeleteOutlineIcon fontSize="small" className="text-red-400" />
                  </IconButton>
                </div>
              </div>
              {/* Turlari bo'lsa - kirim aynan qaysi turga tushishi. */}
              {(row.variants?.length ?? 0) > 0 && (
                <TextField
                  select
                  size="small"
                  label="Turi"
                  value={row.variantId ?? ""}
                  onChange={(e) => updateRow(row.productId, { variantId: e.target.value })}
                  className="mb-2"
                  fullWidth
                >
                  {(row.variants ?? []).map((variant) => (
                    <MenuItem key={variant.id} value={variant.id}>
                      {variant.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}

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
