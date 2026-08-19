"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import NextLink from "next/link";
import { Button, IconButton, TextField, CircularProgress } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import AddIcon from "@mui/icons-material/Add";
import { getProductsPage, searchProductsByPrefix } from "@/lib/firebase/firestore";
import { BulkPriceDialog } from "./BulkPriceDialog";
import { SearchBar } from "@/components/product/SearchBar";
import type { Product } from "@/types/product";

const PAGE_SIZE = 20;

export function ProductTable() {
  const [products, setProducts] = useState<Product[]>([]);
  // Kursor - oxirgi hujjatning ID si (so'rov server orqali ketadi).
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [savingFieldKey, setSavingFieldKey] = useState<string | null>(null);
  const [reindexResult, setReindexResult] = useState<string | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);

  // Bir martalik: eski mahsulotlarga qidiruv tokenlarini va MAHSULOT
  // RAQAMINI (1, 2, 3...) yozadi - raqami yo'q eskilari eng eskisidan
  // boshlab raqamlanadi.
  const handleReindex = async (renumber = false) => {
    // Qayta tartiblash mavjud raqamlarni o'zgartiradi - tasdiq so'raymiz.
    if (
      renumber &&
      !confirm(
        "Hamma mahsulot raqami qaytadan beriladi (1, 2, 3...). " +
          "Guruhda avval yozilgan raqamlar boshqa mahsulotni ko'rsatib qolishi mumkin. Davom etamizmi?"
      )
    ) {
      return;
    }

    setIsReindexing(true);
    setReindexResult(null);
    try {
      const res = await fetch("/api/admin/products/reindex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renumber }),
      });
      const data = await res.json();
      setReindexResult(
        res.ok
          ? `✅ ${data.updated} ta mahsulot yangilandi (${data.codesAdded ?? 0} tasining raqami ` +
              `${renumber ? "qayta berildi" : "to'ldirildi"})` +
              // Keyingi mahsulot qaysi raqamni olishini AYTAMIZ: qayta
              // tartiblashdan keyin hisoblagich ham tushishi kerak va
              // foydalanuvchi buni ko'rib ishonch hosil qiladi.
              (data.nextCode ? `. Keyingi mahsulot raqami: ${data.nextCode}` : "")
          : "Xatolik yuz berdi"
      );
    } catch {
      setReindexResult("Xatolik yuz berdi");
    } finally {
      setIsReindexing(false);
    }
  };

  const trimmedSearch = searchTerm.trim();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        if (trimmedSearch) {
          const results = await searchProductsByPrefix(trimmedSearch, PAGE_SIZE, true);
          if (cancelled) return;
          setProducts(results);
          setHasMore(false);
        } else {
          const page = await getProductsPage({ sortBy: "newest" }, PAGE_SIZE, null, true);
          if (cancelled) return;
          setProducts(page.products);
          setCursor(page.lastCursor);
          setHasMore(page.hasMore);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [trimmedSearch]);

  const loadMore = async () => {
    setIsLoading(true);
    try {
      const page = await getProductsPage({ sortBy: "newest" }, PAGE_SIZE, cursor, true);
      setProducts((prev) => [...prev, ...page.products]);
      setCursor(page.lastCursor);
      setHasMore(page.hasMore);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldSave = async (productId: string, field: "price" | "stock", value: number) => {
    setSavingFieldKey(`${productId}-${field}`);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, [field]: value } : p)));
      }
    } finally {
      setSavingFieldKey(null);
    }
  };

  /** Butun katalogni tashqi qidiruv motoriga yuborish. */
  const handleSearchIndex = async () => {
    setIsReindexing(true);
    setReindexResult(null);
    try {
      const res = await fetch("/api/admin/products/search-index", { method: "POST" });
      const data = await res.json();
      setReindexResult(
        res.ok ? `Qidiruv motoriga ${data.indexed} ta mahsulot yuborildi.` : data.error
      );
    } catch {
      setReindexResult("Qidiruv motoriga ulanib bo'lmadi.");
    } finally {
      setIsReindexing(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Mahsulotni o'chirishni tasdiqlaysizmi?")) return;
    const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Mahsulot nomi bo'yicha qidirish..." className="max-w-sm" />
        <Button variant="outlined" onClick={() => setIsBulkDialogOpen(true)}>Bulk narx yangilash</Button>
        <Button variant="outlined" onClick={() => handleReindex(false)} disabled={isReindexing}>
          {isReindexing ? <CircularProgress size={18} /> : "Raqam va qidiruv indeksini yangilash"}
        </Button>
        {/* O'chirilgan mahsulotdan bo'sh raqam qolganda - qayta tartiblash. */}
        <Button variant="text" onClick={() => handleReindex(true)} disabled={isReindexing}>
          Raqamlarni qayta tartiblash
        </Button>
        {/* Tashqi qidiruv motori (Typesense) sozlangan bo'lsa - butun
            katalogni unga yuborish. Sozlanmagan bo'lsa tugma sababini
            aytadi. */}
        <Button variant="text" onClick={handleSearchIndex} disabled={isReindexing}>
          Qidiruv motorini to&apos;ldirish
        </Button>
        {reindexResult && <span className="text-sm text-navy-300">{reindexResult}</span>}
        <Button variant="contained" startIcon={<AddIcon />} className="!ml-auto" component={NextLink} href="/admin/katalog/kirim">
          Mahsulot kirimi
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 dark:border-navy-500">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-navy-50 text-navy-300 dark:bg-navy-900">
            <tr>
              <th className="px-4 py-2 font-medium">№</th>
              <th className="px-4 py-2 font-medium">Mahsulot</th>
              <th className="px-4 py-2 font-medium">Narx</th>
              <th className="px-4 py-2 font-medium">Zaxira</th>
              <th className="px-4 py-2 font-medium">Amallar</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-navy-700">
            {products.map((product) => (
              <tr key={product.id} className="border-t border-navy-100 dark:border-navy-500">
                {/* Mahsulot raqami - guruh xabarlarida va bot buyruqlarida shu ishlatiladi. */}
                <td className="px-4 py-2 text-navy-300">{product.code ?? "—"}</td>
                <td className="flex items-center gap-2 px-4 py-2">
                  {product.thumbnailUrl && (
                    <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-md bg-navy-50 dark:bg-navy-900">
                      <Image src={product.thumbnailUrl} alt={product.name} fill sizes="40px" className="object-cover" />
                    </span>
                  )}
                  <span className="line-clamp-1 text-navy-900 dark:text-white">
                    {product.name}
                    {/* Chernovik: hali katalogda ham, kanalda ham yo'q. */}
                    {product.isDraft && (
                      <span className="ml-2 rounded bg-aqua-500/15 px-1.5 py-0.5 text-xs text-aqua-600">
                        chernovik
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <TextField
                    size="small"
                    type="number"
                    defaultValue={product.price}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (value !== product.price) handleFieldSave(product.id, "price", value);
                    }}
                    slotProps={{ input: { className: "w-28" } }}
                  />
                  {savingFieldKey === `${product.id}-price` && <CircularProgress size={14} className="ml-2" />}
                </td>
                <td className="px-4 py-2">
                  <TextField
                    size="small"
                    type="number"
                    defaultValue={product.stock}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (value !== product.stock) handleFieldSave(product.id, "stock", value);
                    }}
                    slotProps={{ input: { className: "w-20" } }}
                  />
                  {savingFieldKey === `${product.id}-stock` && <CircularProgress size={14} className="ml-2" />}
                </td>
                <td className="px-4 py-2">
                  {/* Tahrirlash va o'chirish orasida bo'shliq - telefonda
                      xato bosib yubormaslik uchun. */}
                  <div className="flex items-center gap-3">
                    <IconButton
                      size="small"
                      aria-label="Tahrirlash"
                      component={NextLink}
                      href={`/admin/katalog/${product.id}/tahrir`}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" aria-label="O'chirish" onClick={() => handleDelete(product.id)}>
                      <DeleteOutlineIcon fontSize="small" className="text-red-400" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <CircularProgress size={24} />
        </div>
      )}

      {!isLoading && hasMore && !trimmedSearch && (
        <div className="flex justify-center py-4">
          <Button onClick={loadMore}>Ko&apos;proq yuklash</Button>
        </div>
      )}

      <BulkPriceDialog open={isBulkDialogOpen} onClose={() => setIsBulkDialogOpen(false)} />
    </div>
  );
}
