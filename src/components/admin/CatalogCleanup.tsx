"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import NextLink from "next/link";
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  TextField,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import type { Taxonomy } from "@/lib/products/taxonomy";

/**
 * KATALOGNI TARTIBGA SOLISH (katta importdan keyin).
 *
 * Excel bilan minglab mahsulot kirgach ularning ichida xatolar bo'ladi:
 * kategoriyasi noto'g'ri tushgani, keraksizi, rasmi yo'g'i. Bu sahifa
 * shu ish uchun:
 *
 *   1) BRENED yoki KATEGORIYA bo'yicha filtrlab ro'yxat olinadi
 *      (qidiruv, "rasmsizlar", "zaxirasi 0" filtrlari sahifada);
 *   2) belgilanganlarini o'chirish / kategoriya-brendini to'g'rilash /
 *      sotuvdan olish;
 *   3) har biriga shu yerning o'zida rasm yuklash;
 *   4) tayyor bo'lganlarini TANLAB kanalga e'lon qilish.
 *
 * Har bir amal xodimlar guruhidagi "actions" topikka yozib boriladi.
 */

interface ListProduct {
  id: string;
  name: string;
  code: number | null;
  sku: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  unit: string;
  isActive: boolean;
  isDraft: boolean;
  thumbnailUrl: string;
  hasVideo: boolean;
  imageCount: number;
  posted: boolean;
}

/** Kanalga e'lon serverda sekin ketadi - bir so'rovda shuncha. */
const ANNOUNCE_CHUNK = 10;
const EDIT_CHUNK = 200;
const PAGE_SIZE = 50;

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

interface Props {
  taxonomy: Taxonomy;
  brands: string[];
}

export function CatalogCleanup({ taxonomy, brands }: Props) {
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [products, setProducts] = useState<ListProduct[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadedAll, setLoadedAll] = useState(false);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [onlyNoImage, setOnlyNoImage] = useState(false);
  const [onlyNotPosted, setOnlyNotPosted] = useState(false);
  const [page, setPage] = useState(0);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** Kanalda turgan mahsulotning eski postini o'chirib, yangisini tashlash. */
  const [repostMode, setRepostMode] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ kind: "ok" | "error" | "info"; text: string } | null>(null);

  /** Bulk tahrir uchun tanlangan yangi qiymatlar. */
  const [newCategory, setNewCategory] = useState("");
  const [newBrand, setNewBrand] = useState("");

  /** Rasm yuklanayotgan mahsulot. */
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const uploadTarget = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const categoryLabel = (slug: string) =>
    taxonomy.categories.find((item) => item.slug === slug)?.label ?? slug;

  /** Ro'yxatni (filtr bo'yicha) yuklaydi. */
  const load = async (reset: boolean, all = false) => {
    setLoading(true);
    setMessage(null);
    try {
      let next: string | null = reset ? null : cursor;
      if (reset) {
        setProducts([]);
        setSelected(new Set());
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
      if (onlyNoImage && product.imageCount > 0) return false;
      if (onlyNotPosted && product.posted) return false;
      // Kategoriya serverda filtrlangan bo'lsa ham, brend qo'shimcha
      // filtr sifatida shu yerda qo'llanadi (ikkovi birga - indekssiz).
      if (category && brand && product.brand !== brand) return false;
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term) ||
        String(product.code ?? "").includes(term)
      );
    });
  }, [products, search, onlyNoImage, onlyNotPosted, category, brand]);

  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const selectedIds = useMemo(() => [...selected], [selected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => setSelected(new Set(filtered.map((item) => item.id)));

  /** Amal natijasidan keyin ro'yxatni yangilash. */
  const applyLocal = (ids: string[], patch: Partial<ListProduct> | "remove") => {
    setProducts((prev) =>
      patch === "remove"
        ? prev.filter((item) => !ids.includes(item.id))
        : prev.map((item) => (ids.includes(item.id) ? { ...item, ...patch } : item))
    );
    setSelected(new Set());
  };

  const runDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`${selectedIds.length} ta mahsulot butunlay o'chiriladi. Davom etamizmi?`)) return;

    setBusy("delete");
    setProgress(0);
    try {
      for (let i = 0; i < selectedIds.length; i += EDIT_CHUNK) {
        const res = await fetch("/api/admin/products/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", ids: selectedIds.slice(i, i + EDIT_CHUNK) }),
        });
        if (!res.ok) throw new Error("O'chirishda xatolik.");
        setProgress(Math.round(((i + EDIT_CHUNK) / selectedIds.length) * 100));
      }
      applyLocal(selectedIds, "remove");
      setMessage({ kind: "ok", text: `🗑 ${selectedIds.length} ta mahsulot o'chirildi.` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
      setProgress(0);
    }
  };

  const runUpdate = async (patch: Record<string, unknown>, label: string) => {
    if (selectedIds.length === 0) return;
    setBusy("update");
    setProgress(0);
    try {
      for (let i = 0; i < selectedIds.length; i += EDIT_CHUNK) {
        const res = await fetch("/api/admin/products/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", ids: selectedIds.slice(i, i + EDIT_CHUNK), patch }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Tahrirlashda xatolik.");
        }
        setProgress(Math.round(((i + EDIT_CHUNK) / selectedIds.length) * 100));
      }
      applyLocal(selectedIds, patch as Partial<ListProduct>);
      setMessage({ kind: "ok", text: `✏️ ${selectedIds.length} ta mahsulot yangilandi (${label}).` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
      setProgress(0);
    }
  };

  /**
   * Tanlanganlarni kanalga e'lon qilish (10 tadan, sekin).
   *
   * MUHIM: kanalda ALLAQACHON turgan mahsulot uchun yangi post
   * tashlanmaydi - eski post joyida tahrirlanadi (kanal takrorlar
   * bilan to'lib ketmasin). Shu sababli natija ajratib ko'rsatiladi.
   * Haqiqatan yangi post kerak bo'lsa - "Qayta post qilish" belgisi.
   */
  const runAnnounce = async () => {
    if (selectedIds.length === 0) return;
    const already = selectedIds.filter((id) => products.find((item) => item.id === id)?.posted).length;

    if (
      !confirm(
        `${selectedIds.length} ta mahsulot kanalga post qilinadi.` +
          (already > 0
            ? repostMode
              ? `\n\n${already} tasi allaqachon kanalda — ULARNING ESKI POSTI O'CHIRILIB, yangisi tashlanadi.`
              : `\n\n${already} tasi allaqachon kanalda — ular uchun YANGI post tashlanmaydi, eski posti yangilanadi. Yangi post kerak bo'lsa "Qayta post qilish" belgisini qo'ying.`
            : "") +
          "\n\nTelegram chegarasi tufayli sekin ketadi — oynani yopmang. Davom etamizmi?"
      )
    ) {
      return;
    }

    setBusy("announce");
    setProgress(0);
    let posted = 0;
    let edited = 0;
    let unchanged = 0;
    const skipped: string[] = [];
    try {
      for (let i = 0; i < selectedIds.length; i += ANNOUNCE_CHUNK) {
        const res = await fetch("/api/admin/products/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "announce",
            ids: selectedIds.slice(i, i + ANNOUNCE_CHUNK),
            repost: repostMode,
          }),
        });
        if (!res.ok) throw new Error("E'lon qilishda xatolik.");
        const data = (await res.json()) as {
          posted: number;
          edited?: number;
          unchanged?: number;
          skipped: string[];
        };
        posted += data.posted;
        edited += data.edited ?? 0;
        unchanged += data.unchanged ?? 0;
        skipped.push(...data.skipped);
        setProgress(Math.round(((i + ANNOUNCE_CHUNK) / selectedIds.length) * 100));
      }

      applyLocal(selectedIds, { posted: true });
      const parts: string[] = [];
      if (posted > 0) parts.push(`${posted} ta YANGI post kanalga tushdi`);
      if (edited > 0) parts.push(`${edited} tasining eski posti yangilandi`);
      if (unchanged > 0) parts.push(`${unchanged} tasida o'zgarish yo'q edi`);
      if (skipped.length > 0) parts.push(`${skipped.length} tasi o'tkazib yuborildi`);

      setMessage({
        kind: posted > 0 && skipped.length === 0 ? "ok" : "info",
        text:
          `📢 ${parts.join(", ")}.` +
          (posted === 0 && (edited > 0 || unchanged > 0)
            ? " Kanalga yangi xabar kelmagani shundan — bular avval e'lon qilingan. " +
              "Yangi post kerak bo'lsa \"Qayta post qilish\" belgisini qo'ying."
            : "") +
          (skipped.length > 0 ? ` (${skipped.slice(0, 3).join("; ")})` : ""),
      });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
      setProgress(0);
    }
  };

  /**
   * Belgilanganlarni ijtimoiy tarmoqlarga joylash (Instagram/Facebook;
   * videosi bori YouTube'ga ham). Har biri alohida yuboriladi -
   * tarmoqlar tez ketma-ket post qilishni yoqtirmaydi.
   */
  const runSocial = async () => {
    if (selectedIds.length === 0) return;
    const withVideo = selectedIds.filter(
      (id) => products.find((item) => item.id === id)?.hasVideo
    ).length;
    if (
      !confirm(
        `${selectedIds.length} ta mahsulot Instagram/Facebook'ga joylanadi` +
          (withVideo > 0 ? `, shundan ${withVideo} tasi YouTube'ga ham (videosi bor)` : "") +
          ". Tarmoqlarning kunlik chegarasi bor (odatda 50 ta). Davom etamizmi?"
      )
    ) {
      return;
    }

    setBusy("social");
    setProgress(0);
    let done = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < selectedIds.length; i += 1) {
        const id = selectedIds[i]!;
        const product = products.find((item) => item.id === id);
        const res = await fetch("/api/admin/social/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: id,
            // YouTube - faqat videosi bor mahsulotda (Shorts); videosizini
            // yuborsak har biriga keraksiz xato qaytadi.
            networks: product?.hasVideo
              ? ["instagram", "facebook", "youtube"]
              : ["instagram", "facebook"],
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { done?: string[]; errors?: string[] };
        if ((data.done?.length ?? 0) > 0) done += 1;
        for (const error of data.errors ?? []) {
          if (errors.length < 5) errors.push(`${product?.name ?? id}: ${error}`);
        }
        setProgress(Math.round(((i + 1) / selectedIds.length) * 100));
      }

      setMessage({
        kind: errors.length > 0 ? "info" : "ok",
        text:
          `📣 ${done} ta mahsulot joylandi.` +
          (errors.length > 0 ? ` Xatolar: ${errors.join("; ")}` : ""),
      });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
      setProgress(0);
    }
  };

  /** Bitta mahsulotni o'chirish (belgilamasdan, qatorning o'zidan). */
  const deleteOne = async (product: ListProduct) => {
    if (!confirm(`"${product.name}" butunlay o'chiriladi. Davom etamizmi?`)) return;

    setBusy("delete-one");
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: [product.id] }),
      });
      if (!res.ok) throw new Error("O'chirishda xatolik.");
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
      setMessage({ kind: "ok", text: `🗑 "${product.name}" o'chirildi.` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
    }
  };

  /** Bitta mahsulotga rasm yuklash (ro'yxatdan chiqmasdan). */
  const uploadImages = async (files: FileList | null) => {
    const productId = uploadTarget.current;
    if (!productId || !files || files.length === 0) return;

    setUploadingId(productId);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("productId", productId);
      Array.from(files)
        .slice(0, 10)
        .forEach((file) => form.append("files", file));

      const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: form });
      if (!uploadRes.ok) {
        const body = (await uploadRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Rasm yuklanmadi.");
      }
      const { urls } = (await uploadRes.json()) as { urls: string[] };

      const patchRes = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: urls }),
      });
      if (!patchRes.ok) throw new Error("Rasm mahsulotga biriktirilmadi.");

      setProducts((prev) =>
        prev.map((item) =>
          item.id === productId
            ? { ...item, thumbnailUrl: urls[0] ?? item.thumbnailUrl, imageCount: urls.length }
            : item
        )
      );
      setMessage({ kind: "ok", text: `🖼 ${urls.length} ta rasm yuklandi.` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setUploadingId(null);
      uploadTarget.current = null;
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filtr */}
      <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700">
        <div className="flex flex-wrap items-center gap-2">
          <TextField
            select
            size="small"
            label="Kategoriya"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            sx={{ minWidth: 200 }}
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
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Hammasi</MenuItem>
            {brands.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>

          <Button variant="contained" onClick={() => void load(true)} disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : "Ro'yxatni olish"}
          </Button>
          {products.length > 0 && !loadedAll && (
            <Button onClick={() => void load(false, true)} disabled={loading}>
              Hammasini yuklash
            </Button>
          )}
        </div>

        {products.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
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
            <label className="flex items-center gap-1 text-sm text-navy-300">
              <Checkbox size="small" checked={onlyNoImage} onChange={(e) => setOnlyNoImage(e.target.checked)} />
              Rasmi yo&apos;qlar
            </label>
            <label className="flex items-center gap-1 text-sm text-navy-300">
              <Checkbox size="small" checked={onlyNotPosted} onChange={(e) => setOnlyNotPosted(e.target.checked)} />
              Kanalga chiqmaganlar
            </label>
            <span className="text-sm text-navy-300">
              Topildi: {filtered.length}
              {loadedAll ? "" : "+"} • Belgilangan: {selectedIds.length}
            </span>
          </div>
        )}
      </div>

      {message && <Alert severity={message.kind === "ok" ? "success" : message.kind}>{message.text}</Alert>}
      {busy && <LinearProgress variant="determinate" value={progress} />}

      {/* Belgilanganlar ustida amallar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl2 border border-aqua-200 bg-aqua-50/40 p-4 dark:border-navy-500 dark:bg-navy-600/40">
          <p className="text-sm font-medium text-navy-700 dark:text-navy-100">
            Belgilangan {selectedIds.length} ta mahsulot bilan:
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <TextField
              select
              size="small"
              label="Kategoriyaga ko'chirish"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              sx={{ minWidth: 200 }}
            >
              {taxonomy.categories.map((item) => (
                <MenuItem key={item.slug} value={item.slug}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
            <Button
              size="small"
              variant="outlined"
              disabled={!newCategory || busy !== null}
              onClick={() => void runUpdate({ category: newCategory }, categoryLabel(newCategory))}
            >
              Ko&apos;chirish
            </Button>

            <TextField
              size="small"
              label="Brendni o'zgartirish"
              value={newBrand}
              onChange={(event) => setNewBrand(event.target.value)}
              sx={{ width: 180 }}
            />
            <Button
              size="small"
              variant="outlined"
              disabled={!newBrand.trim() || busy !== null}
              onClick={() => void runUpdate({ brand: newBrand.trim() }, newBrand.trim())}
            >
              Yozish
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="small"
              variant="contained"
              startIcon={<CampaignOutlinedIcon />}
              disabled={busy !== null}
              onClick={() => void runAnnounce()}
            >
              Kanalga post qilish
            </Button>
            {/* Kanalda turgani uchun yangi post tashlanmasligi ko'pincha
                "post kelmadi" degan taassurot qoldiradi - shu belgi bilan
                eski post o'chirilib, yangisi tashlanadi. */}
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={repostMode}
                  onChange={(event) => setRepostMode(event.target.checked)}
                />
              }
              label={<span className="text-xs">Qayta post qilish (eskisini o&apos;chirib)</span>}
            />
            <Button
              size="small"
              variant="contained"
              color="secondary"
              startIcon={<ShareOutlinedIcon />}
              disabled={busy !== null}
              onClick={() => void runSocial()}
            >
              Instagram/Facebook
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={busy !== null}
              onClick={() => void runUpdate({ isActive: false }, "sotuvdan olindi")}
            >
              Sotuvdan olish
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={busy !== null}
              onClick={() => void runUpdate({ isActive: true }, "sotuvga qaytarildi")}
            >
              Sotuvga qaytarish
            </Button>
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlineIcon />}
              disabled={busy !== null}
              onClick={() => void runDelete()}
            >
              O&apos;chirish
            </Button>
            <Button size="small" onClick={() => setSelected(new Set())}>
              Belgilashni bekor qilish
            </Button>
          </div>
        </div>
      )}

      {/* Ro'yxat */}
      {products.length > 0 && (
        <div className="overflow-x-auto rounded-xl2 border border-navy-100 dark:border-navy-500">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-navy-50 text-navy-300 dark:bg-navy-900">
              <tr>
                <th className="px-2 py-2">
                  <Checkbox
                    size="small"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < filtered.length}
                    onChange={(event) =>
                      event.target.checked ? selectAllFiltered() : setSelected(new Set())
                    }
                  />
                </th>
                <th className="px-3 py-2 font-medium">Mahsulot</th>
                <th className="px-3 py-2 font-medium">Kategoriya</th>
                <th className="px-3 py-2 font-medium">Narx</th>
                <th className="px-3 py-2 font-medium">Zaxira</th>
                <th className="px-3 py-2 font-medium">Holat</th>
                <th className="px-3 py-2 font-medium">Amallar</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-navy-700">
              {pageItems.map((product) => (
                <tr key={product.id} className="border-t border-navy-100 dark:border-navy-500">
                  <td className="px-2 py-2">
                    <Checkbox size="small" checked={selected.has(product.id)} onChange={() => toggle(product.id)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {product.thumbnailUrl ? (
                        <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-md bg-navy-50 dark:bg-navy-900">
                          <Image src={product.thumbnailUrl} alt={product.name} fill sizes="40px" className="object-cover" />
                        </span>
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-navy-200 text-[10px] text-navy-300 dark:border-navy-500">
                          rasm
                        </span>
                      )}
                      <span className="line-clamp-2 text-navy-900 dark:text-white">
                        {product.code ? `№${product.code} · ` : ""}
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-navy-300">{categoryLabel(product.category)}</td>
                  <td className="px-3 py-2">{formatSom(product.price)}</td>
                  <td className="px-3 py-2">
                    {product.stock} {product.unit}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {!product.isActive && <span className="text-navy-300">sotuvda emas</span>}
                    {product.isDraft && <span className="text-aqua-600">chernovik</span>}
                    {product.isActive && !product.isDraft && (
                      <span className={product.posted ? "text-green-600" : "text-navy-300"}>
                        {product.posted ? "kanalda" : "kanalga chiqmagan"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {/* O'chirish - eng chapda: filtrda keraksizi chiqsa darhol. */}
                      <IconButton
                        size="small"
                        aria-label="O'chirish"
                        disabled={busy !== null}
                        onClick={() => void deleteOne(product)}
                      >
                        <DeleteOutlineIcon fontSize="small" className="text-red-400" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Rasm yuklash"
                        disabled={uploadingId !== null}
                        onClick={() => {
                          uploadTarget.current = product.id;
                          fileInput.current?.click();
                        }}
                      >
                        {uploadingId === product.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <AddPhotoAlternateOutlinedIcon fontSize="small" />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Tahrirlash"
                        component={NextLink}
                        href={`/admin/katalog/${product.id}/tahrir`}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sahifalash */}
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

      {/* Rasm tanlash (ro'yxatdagi tugmalar shu inputni ishlatadi) */}
      <input
        ref={fileInput}
        type="file"
        hidden
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(event) => void uploadImages(event.target.files)}
      />
    </div>
  );
}
