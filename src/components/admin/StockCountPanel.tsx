"use client";

import { useMemo, useState } from "react";
import { Alert, Button, CircularProgress, LinearProgress, MenuItem, TextField } from "@mui/material";
import ChecklistOutlinedIcon from "@mui/icons-material/ChecklistOutlined";
import type { Taxonomy } from "@/lib/products/taxonomy";

/**
 * FILTR BO'YICHA SANOQ (inventarizatsiya).
 *
 * Mahsulotni bittalab qidirib sanash 3 000+ katalogda amalda mumkin
 * emas. Bu bo'lim javon-javon ishlash uchun: kategoriya yoki brend
 * tanlanadi, ro'yxat chiqadi va omborda HAQIQATAN nechta borligi
 * yoziladi. Saqlaganda zaxira shu songa tenglashadi va har biri ombor
 * tarixiga "sanoq" bo'lib tushadi (eski → yangi qoldiq bilan).
 *
 * "Chiqim" rejimida esa yozilgan son zaxiradan AYIRILADI (singan,
 * yo'qolgan, sovg'a qilingan mahsulot).
 */

interface ListProduct {
  id: string;
  name: string;
  code: number | null;
  sku: string;
  category: string;
  brand: string;
  stock: number;
  unit: string;
}

const PAGE_SIZE = 50;
const CHUNK = 200;

interface Props {
  taxonomy: Taxonomy;
  brands: string[];
  /** Saqlangach ombor tarixini yangilash. */
  onSaved?: () => void;
}

export function StockCountPanel({ taxonomy, brands, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"count" | "out">("count");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [note, setNote] = useState("");

  const [products, setProducts] = useState<ListProduct[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadedAll, setLoadedAll] = useState(false);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  /** productId -> kiritilgan son (bo'sh bo'lsa - tegilmagan). */
  const [values, setValues] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ kind: "ok" | "error" | "info"; text: string } | null>(null);

  const load = async (reset: boolean, all = false) => {
    setLoading(true);
    setMessage(null);
    try {
      let next: string | null = reset ? null : cursor;
      if (reset) {
        setProducts([]);
        setValues({});
        setLoadedAll(false);
        setPage(0);
      }
      let guard = 0;

      do {
        const params = new URLSearchParams({ limit: "300" });
        if (category) params.set("category", category);
        else if (brand) params.set("brand", brand);
        if (next) params.set("after", next);

        const res = await fetch(`/api/admin/products/list?${params.toString()}`);
        if (!res.ok) throw new Error("Ro'yxatni olishda xatolik.");
        const data = (await res.json()) as { products: ListProduct[]; nextCursor: string | null };

        setProducts((prev) => {
          const base = reset && guard === 0 ? [] : prev;
          const seen = new Set(base.map((item) => item.id));
          return [...base, ...data.products.filter((item) => !seen.has(item.id))];
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
    return products.filter((product) => {
      if (category && brand && product.brand !== brand) return false;
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        String(product.code ?? "").includes(term)
      );
    });
  }, [products, search, category, brand]);

  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  /** Kiritilgan va zaxiradan farq qiladigan qatorlar. */
  const changes = useMemo(
    () =>
      Object.entries(values)
        .map(([id, raw]) => ({ id, qty: Number(raw) }))
        .filter(({ id, qty }) => {
          if (!Number.isFinite(qty) || qty < 0) return false;
          const product = products.find((item) => item.id === id);
          if (!product) return false;
          return mode === "out" ? qty > 0 : qty !== product.stock;
        }),
    [values, products, mode]
  );

  /** Sahifadagi hamma qatorga bir xil son (masalan hammasi 0). */
  const fillPage = (value: string) => {
    setValues((prev) => {
      const patch = { ...prev };
      for (const product of pageItems) patch[product.id] = value;
      return patch;
    });
  };

  const save = async () => {
    if (changes.length === 0) return;
    if (
      !confirm(
        mode === "count"
          ? `${changes.length} ta mahsulotning qoldig'i kiritilgan songa tenglashtiriladi. Davom etamizmi?`
          : `${changes.length} ta mahsulotdan chiqim qilinadi. Davom etamizmi?`
      )
    ) {
      return;
    }

    setSaving(true);
    setProgress(0);
    setMessage(null);
    let updated = 0;
    const skipped: string[] = [];

    try {
      for (let i = 0; i < changes.length; i += CHUNK) {
        const res = await fetch("/api/admin/inventory", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: mode,
            note: note.trim(),
            items: changes.slice(i, i + CHUNK).map((item) => ({
              productId: item.id,
              qty: item.qty,
            })),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          updated?: number;
          skipped?: string[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Saqlashda xatolik.");
        updated += data.updated ?? 0;
        skipped.push(...(data.skipped ?? []));
        setProgress(Math.round(((i + CHUNK) / changes.length) * 100));
      }

      // Ro'yxatdagi qoldiqlarni yangilaymiz - qaytadan yuklash shart emas.
      setProducts((prev) =>
        prev.map((product) => {
          const change = changes.find((item) => item.id === product.id);
          if (!change) return product;
          return {
            ...product,
            stock: mode === "count" ? change.qty : Math.max(0, product.stock - change.qty),
          };
        })
      );
      setValues({});
      setMessage({
        kind: skipped.length > 0 ? "info" : "ok",
        text:
          `✅ ${updated} ta mahsulot qoldig'i yangilandi.` +
          (skipped.length > 0 ? ` Zaxirasi yetmagani uchun ${skipped.length} tasi o'tkazib yuborildi.` : ""),
      });
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
        startIcon={<ChecklistOutlinedIcon />}
        onClick={() => setOpen(true)}
      >
        Ro&apos;yxat bo&apos;yicha sanoq
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-navy-900 dark:text-white">Ro&apos;yxat bo&apos;yicha sanoq</h2>
          <p className="mt-1 text-xs text-navy-300">
            Kategoriya yoki brendni tanlang — javondagi mahsulotlar ro&apos;yxati chiqadi.
            Har biriga <b>haqiqiy sonini</b> yozing va bitta bosishda saqlang.
          </p>
        </div>
        <Button size="small" onClick={() => setOpen(false)}>
          Yopish
        </Button>
      </div>

      {/* Filtr */}
      <div className="flex flex-wrap items-center gap-2">
        <TextField
          select
          size="small"
          label="Amal"
          value={mode}
          onChange={(event) => setMode(event.target.value as "count" | "out")}
          sx={{ width: 150 }}
        >
          <MenuItem value="count">Sanoq</MenuItem>
          <MenuItem value="out">Chiqim</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="Kategoriya"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          sx={{ minWidth: 190 }}
        >
          <MenuItem value="">Hammasi</MenuItem>
          {taxonomy.categories.map((item) => (
            <MenuItem key={item.slug} value={item.slug}>
              {item.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Brend"
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="">Hammasi</MenuItem>
          {brands.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" disabled={loading} onClick={() => void load(true)}>
          {loading ? <CircularProgress size={20} color="inherit" /> : "Ro'yxatni olish"}
        </Button>
        {products.length > 0 && !loadedAll && (
          <Button disabled={loading} onClick={() => void load(false, true)}>
            Hammasini yuklash
          </Button>
        )}
      </div>

      {products.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <TextField
            size="small"
            placeholder="Ro'yxatdan qidirish"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            sx={{ flex: "1 1 200px" }}
          />
          <TextField
            size="small"
            label="Izoh (ixtiyoriy)"
            placeholder="Masalan: 1-javon sanoq"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            sx={{ flex: "1 1 180px" }}
          />
          {mode === "count" && (
            <Button size="small" variant="outlined" onClick={() => fillPage("0")}>
              Sahifadagilarga 0
            </Button>
          )}
          <Button size="small" onClick={() => setValues({})}>
            Tozalash
          </Button>
        </div>
      )}

      {message && <Alert severity={message.kind === "ok" ? "success" : message.kind}>{message.text}</Alert>}
      {saving && <LinearProgress variant="determinate" value={progress} />}

      {/* Ro'yxat */}
      {products.length > 0 && (
        <div className="flex flex-col divide-y divide-navy-100 dark:divide-navy-500">
          {pageItems.map((product) => {
            const raw = values[product.id] ?? "";
            const value = Number(raw);
            const diff = raw !== "" && Number.isFinite(value) ? value - product.stock : 0;

            return (
              <div key={product.id} className="flex flex-wrap items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-navy-900 dark:text-white">
                    {product.code ? `№${product.code} · ` : ""}
                    {product.name}
                  </p>
                  <p className="text-xs text-navy-300">
                    Tizimda: {product.stock} {product.unit}
                    {product.sku ? ` · ${product.sku}` : ""}
                    {/* Farqi darhol ko'rinib tursin - xato yozilsa sezilaadi. */}
                    {mode === "count" && raw !== "" && diff !== 0 && (
                      <span className={diff < 0 ? " text-red-400" : " text-green-500"}>
                        {" "}
                        · {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </p>
                </div>

                <TextField
                  size="small"
                  label={mode === "count" ? "Haqiqiy" : "Chiqim"}
                  value={raw}
                  onChange={(event) => {
                    const clean = event.target.value.replace(/[^\d]/g, "");
                    setValues((prev) => {
                      const patch = { ...prev };
                      if (clean === "") delete patch[product.id];
                      else patch[product.id] = clean;
                      return patch;
                    });
                  }}
                  sx={{ width: 110 }}
                />
              </div>
            );
          })}

          {pageItems.length === 0 && !loading && (
            <p className="py-4 text-center text-sm text-navy-300">Mos mahsulot topilmadi.</p>
          )}
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button size="small" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
            ← Oldingi
          </Button>
          <span className="text-navy-300">
            {page + 1} / {pageCount}
          </span>
          <Button size="small" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>
            Keyingi →
          </Button>
        </div>
      )}

      {products.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="contained" disabled={saving || changes.length === 0} onClick={() => void save()}>
            {saving ? (
              <CircularProgress size={20} color="inherit" />
            ) : mode === "count" ? (
              `Sanoqni saqlash (${changes.length} ta)`
            ) : (
              `Chiqim qilish (${changes.length} ta)`
            )}
          </Button>
          <span className="text-xs text-navy-300">
            Faqat siz yozgan qatorlar saqlanadi — qolganlariga tegilmaydi.
          </span>
        </div>
      )}
    </div>
  );
}
