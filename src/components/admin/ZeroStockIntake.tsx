"use client";

import { useMemo, useState } from "react";
import { Alert, Button, CircularProgress, LinearProgress, MenuItem, TextField } from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { formatSom } from "@/lib/format";

/**
 * ZAXIRASI YO'Q MAHSULOTLAR RO'YXATI (bir yo'la kirim qilish uchun).
 *
 * Excel bilan minglab mahsulot yaratilgach ularning zaxirasi 0 bo'ladi.
 * Bu bo'lim shu mahsulotlarni ro'yxat qilib beradi: admin sonlarni
 * yozib chiqadi (yoki "hammasiga bir xil son" qo'yadi) va bitta bosishda
 * kirim qiladi. Katta ro'yxat serverga 100 tadan bo'lib yuboriladi.
 */

interface ZeroStockProduct {
  id: string;
  name: string;
  code: number | null;
  sku: string;
  unit: string;
  price: number;
  category: string;
  brand: string;
  isDraft: boolean;
  variants: { id: string; label: string }[];
}

/** Bir so'rovda yuboriladigan qatorlar soni (server chegarasi). */
const CHUNK = 100;
const PAGE_SIZE = 50;

interface Props {
  /** Kirim saqlangach kirim tarixini yangilash. */
  onSaved?: () => void;
  /** Butun kirim uchun umumiy yetkazib beruvchi. */
  supplier?: string;
}

export function ZeroStockIntake({ onSaved, supplier }: Props) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ZeroStockProduct[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedAll, setLoadedAll] = useState(false);

  /** productId -> kelgan soni (0 bo'lsa kirim qilinmaydi). */
  const [qty, setQty] = useState<Record<string, number>>({});
  /** Turlari bor mahsulotda tanlangan tur. */
  const [variant, setVariant] = useState<Record<string, string>>({});

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [bulkQty, setBulkQty] = useState("1");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  /** Ro'yxatning navbatdagi qismini yuklaydi. */
  const loadMore = async (all = false) => {
    setLoading(true);
    try {
      let next: string | null = cursor;
      let guard = 0;
      do {
        const url = `/api/admin/products/zero-stock?limit=300${next ? `&after=${encodeURIComponent(next)}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Ro'yxatni olishda xatolik.");
        const data = (await res.json()) as { products: ZeroStockProduct[]; nextCursor: string | null };

        setProducts((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          return [...prev, ...data.products.filter((item) => !seen.has(item.id))];
        });
        setVariant((prev) => {
          const patch = { ...prev };
          for (const product of data.products) {
            if (product.variants.length > 0 && !patch[product.id]) {
              patch[product.id] = product.variants[0]!.id;
            }
          }
          return patch;
        });

        next = data.nextCursor;
        setCursor(next);
        if (!next) setLoadedAll(true);
        guard += 1;
      } while (all && next && guard < 40);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term) ||
        String(product.code ?? "").includes(term)
    );
  }, [products, search]);

  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const chosen = useMemo(
    () => Object.entries(qty).filter(([, value]) => value > 0),
    [qty]
  );
  const totalQty = chosen.reduce((sum, [, value]) => sum + value, 0);

  /** Ko'rinib turgan (filtrlangan) mahsulotlarning hammasiga bir xil son. */
  const fillAll = (scope: "page" | "filtered") => {
    const value = Math.max(0, Math.round(Number(bulkQty.replace(/\s/g, "")) || 0));
    const list = scope === "page" ? pageItems : filtered;
    setQty((prev) => {
      const patch = { ...prev };
      for (const product of list) {
        if (value > 0) patch[product.id] = value;
        else delete patch[product.id];
      }
      return patch;
    });
  };

  const save = async () => {
    if (chosen.length === 0) return;
    setSaving(true);
    setProgress(0);
    setMessage(null);

    const items = chosen.map(([productId, value]) => {
      const product = products.find((item) => item.id === productId);
      return {
        productId,
        qty: value,
        ...(product && product.variants.length > 0
          ? { variantId: variant[productId] ?? product.variants[0]!.id }
          : {}),
        ...(supplier?.trim() ? { supplier: supplier.trim() } : {}),
      };
    });

    try {
      for (let i = 0; i < items.length; i += CHUNK) {
        const res = await fetch("/api/admin/products/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.slice(i, i + CHUNK),
            // Ko'p mahsulotli kirimda kanal minglab post bilan to'lmasin.
            announce: items.length <= 20,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Kirimni saqlashda xatolik.");
        }
        setProgress(Math.min(100, Math.round(((i + CHUNK) / items.length) * 100)));
      }

      setMessage({
        kind: "ok",
        text: `✅ ${items.length} ta mahsulotga jami ${totalQty} dona kirim qilindi.`,
      });
      // Kirim qilinganlar endi zaxirasiz emas - ro'yxatdan chiqadi.
      const done = new Set(items.map((item) => item.productId));
      setProducts((prev) => prev.filter((item) => !done.has(item.id)));
      setQty({});
      onSaved?.();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };

  if (!open) {
    return (
      <Button
        variant="outlined"
        startIcon={<Inventory2OutlinedIcon />}
        onClick={() => {
          // Ro'yxat bo'lim ochilganda yuklanadi.
          setOpen(true);
          if (products.length === 0) void loadMore();
        }}
      >
        Zaxirasiz mahsulotlar ro&apos;yxati
      </Button>
    );
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-navy-900 dark:text-white">
            Zaxirasiz mahsulotlar {products.length > 0 && `(${products.length}${loadedAll ? "" : "+"})`}
          </h2>
          <p className="mt-1 text-xs text-navy-300">
            Har biriga kelgan sonini yozing yoki &quot;hammasiga&quot; bilan bir xil son qo&apos;ying,
            so&apos;ng pastdagi tugma bilan bittada kirim qiling.
          </p>
        </div>
        <Button size="small" onClick={() => setOpen(false)}>
          Yopish
        </Button>
      </div>

      {/* Yuklash va qidiruv */}
      <div className="flex flex-wrap items-center gap-2">
        <TextField
          size="small"
          placeholder="Ro'yxatdan qidirish (nom, kod, brend)"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
          sx={{ flex: "1 1 220px" }}
        />
        {!loadedAll && (
          <>
            <Button size="small" variant="outlined" onClick={() => void loadMore()} disabled={loading}>
              {loading ? <CircularProgress size={16} /> : "Yana yuklash"}
            </Button>
            <Button size="small" onClick={() => void loadMore(true)} disabled={loading}>
              Hammasini yuklash
            </Button>
          </>
        )}
      </div>

      {/* Hammasiga bir xil son */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-navy-50 p-2 dark:bg-navy-600/40">
        <TextField
          size="small"
          label="Soni"
          value={bulkQty}
          onChange={(event) => setBulkQty(event.target.value.replace(/[^\d]/g, ""))}
          sx={{ width: 100 }}
        />
        <Button size="small" variant="outlined" onClick={() => fillAll("page")}>
          Shu sahifadagilarga
        </Button>
        <Button size="small" variant="outlined" onClick={() => fillAll("filtered")}>
          Ro&apos;yxatdagi hammasiga ({filtered.length})
        </Button>
        <Button size="small" color="inherit" onClick={() => setQty({})}>
          Tozalash
        </Button>
      </div>

      {message && <Alert severity={message.kind === "ok" ? "success" : "error"}>{message.text}</Alert>}

      {/* Ro'yxat */}
      <div className="flex flex-col divide-y divide-navy-100 dark:divide-navy-500">
        {pageItems.map((product) => (
          <div key={product.id} className="flex flex-wrap items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-medium text-navy-900 dark:text-white">
                {product.code ? `№${product.code} · ` : ""}
                {product.name}
              </p>
              <p className="text-xs text-navy-300">
                {formatSom(product.price)}
                {product.sku ? ` · ${product.sku}` : ""}
                {product.brand ? ` · ${product.brand}` : ""}
              </p>
            </div>

            {product.variants.length > 1 && (
              <TextField
                select
                size="small"
                label="Turi"
                value={variant[product.id] ?? product.variants[0]!.id}
                onChange={(event) =>
                  setVariant((prev) => ({ ...prev, [product.id]: event.target.value }))
                }
                sx={{ width: 140 }}
              >
                {product.variants.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.label || item.id}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              size="small"
              label={product.unit}
              value={qty[product.id] ? String(qty[product.id]) : ""}
              onChange={(event) => {
                const value = Math.max(0, Math.round(Number(event.target.value.replace(/[^\d]/g, "")) || 0));
                setQty((prev) => {
                  const patch = { ...prev };
                  if (value > 0) patch[product.id] = value;
                  else delete patch[product.id];
                  return patch;
                });
              }}
              sx={{ width: 90 }}
            />
          </div>
        ))}

        {pageItems.length === 0 && !loading && (
          <p className="py-4 text-center text-sm text-navy-300">
            {products.length === 0 ? "Zaxirasi 0 bo'lgan mahsulot yo'q." : "Qidiruvga mos mahsulot topilmadi."}
          </p>
        )}
      </div>

      {/* Sahifalash */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button size="small" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ← Oldingi
          </Button>
          <span className="text-navy-300">
            {page + 1} / {pageCount}
          </span>
          <Button size="small" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>
            Keyingi →
          </Button>
        </div>
      )}

      {saving && <LinearProgress variant="determinate" value={progress} />}

      {/* Saqlash */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="contained" onClick={save} disabled={saving || chosen.length === 0}>
          {saving ? <CircularProgress size={20} color="inherit" /> : `Kirim qilish (${chosen.length} ta)`}
        </Button>
        {chosen.length > 0 && (
          <span className="text-sm text-navy-300">Jami {totalQty} dona</span>
        )}
        {chosen.length > 20 && (
          <span className="text-xs text-navy-300">
            Ko&apos;p mahsulot bo&apos;lgani uchun kanalga e&apos;lon qilinmaydi.
          </span>
        )}
      </div>
    </div>
  );
}
