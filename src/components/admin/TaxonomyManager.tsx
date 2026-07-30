"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { Taxonomy, TaxonomyKind } from "@/lib/products/taxonomy";

/**
 * KATEGORIYA / MATERIAL / SOTISH TURI ro'yxatlari.
 *
 * Har bir turni qayta nomlash va o'chirish mumkin. Qayta nomlashda
 * ichki kalit (slug) o'zgarmaydi, shuning uchun mahsulotlar buzilmaydi.
 * O'chirishga esa server faqat o'sha tur hech qaysi mahsulotda
 * ishlatilmayotgan bo'lsa ruxsat beradi.
 */

const SECTIONS: { kind: TaxonomyKind; title: string; hint: string; placeholder: string }[] = [
  {
    kind: "categories",
    title: "Kategoriyalar",
    hint: "Katalog bo'limlari. Yangi qo'shilgani mahsulot formasida ham, Telegram kirimida ham darhol ishlaydi.",
    placeholder: "Masalan: Kanalizatsiya",
  },
  {
    kind: "materials",
    title: "Materiallar",
    hint: "Mahsulot nimadan tayyorlangani.",
    placeholder: "Masalan: Alyuminiy",
  },
  {
    kind: "units",
    title: "Sotish turlari",
    hint: "Mahsulot nima bilan sotiladi: dona, metr, kg... Narx va zaxira shu birlikda ko'rsatiladi.",
    placeholder: "Masalan: pog'ona",
  },
];

export function TaxonomyManager() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [builtinSlugs, setBuiltinSlugs] = useState<Record<string, string[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<TaxonomyKind | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  /** Qayta nomlash oynasi. */
  const [editing, setEditing] = useState<{ kind: TaxonomyKind; slug: string; label: string } | null>(
    null
  );

  const load = async () => {
    const res = await fetch("/api/admin/taxonomy");
    if (!res.ok) return;
    const data = (await res.json()) as { taxonomy: Taxonomy; builtinSlugs: Record<string, string[]> };
    setTaxonomy(data.taxonomy);
    setBuiltinSlugs(data.builtinSlugs);
  };

  useEffect(() => {
    let active = true;
    fetch("/api/admin/taxonomy")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
      .then((data: { taxonomy: Taxonomy; builtinSlugs: Record<string, string[]> }) => {
        if (!active) return;
        setTaxonomy(data.taxonomy);
        setBuiltinSlugs(data.builtinSlugs);
      })
      .catch(() => {
        if (active) setMessage({ type: "error", text: "Ro'yxatlarni o'qib bo'lmadi." });
      });
    return () => {
      active = false;
    };
  }, []);

  const add = async (kind: TaxonomyKind) => {
    const label = (drafts[kind] ?? "").trim();
    if (label.length < 2) return;

    setBusy(kind);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, label }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Qo'shilmadi.");
      setDrafts((prev) => ({ ...prev, [kind]: "" }));
      await load();
      setMessage({ type: "success", text: `"${label}" qo'shildi.` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Qo'shilmadi." });
    } finally {
      setBusy(null);
    }
  };

  const rename = async () => {
    if (!editing || editing.label.trim().length < 2) return;
    setBusy(editing.kind);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/taxonomy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: editing.kind, slug: editing.slug, label: editing.label.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Tahrirlanmadi.");
      setEditing(null);
      await load();
      setMessage({ type: "success", text: "Nomi yangilandi." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Tahrirlanmadi." });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (kind: TaxonomyKind, slug: string, label: string) => {
    setBusy(kind);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/taxonomy", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, slug }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "O'chirilmadi.");
      await load();
      setMessage({ type: "success", text: `"${label}" o'chirildi.` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "O'chirilmadi." });
    } finally {
      setBusy(null);
    }
  };

  if (!taxonomy) {
    return (
      <div className="flex justify-center p-6">
        <CircularProgress size={24} />
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {message && <Alert severity={message.type}>{message.text}</Alert>}

      {SECTIONS.map((section) => {
        const items = taxonomy[section.kind];
        const builtin = new Set(builtinSlugs[section.kind] ?? []);

        return (
          <div
            key={section.kind}
            className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700"
          >
            <div>
              <h2 className="font-semibold text-navy-900 dark:text-white">{section.title}</h2>
              <p className="mt-1 text-xs text-navy-300">{section.hint}</p>
            </div>

            <ul className="flex flex-col divide-y divide-navy-100 dark:divide-navy-500">
              {items.map((item) => (
                <li key={item.slug} className="flex items-center gap-2 py-1.5">
                  <span className="flex-1 text-sm text-navy-900 dark:text-white">
                    {item.label}
                    {builtin.has(item.slug) && (
                      <span className="ml-2 text-xs text-navy-300">standart</span>
                    )}
                  </span>
                  <IconButton
                    size="small"
                    aria-label="Tahrirlash"
                    disabled={busy === section.kind}
                    onClick={() => setEditing({ kind: section.kind, slug: item.slug, label: item.label })}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="O'chirish"
                    disabled={busy === section.kind}
                    onClick={() => remove(section.kind, item.slug, item.label)}
                  >
                    <DeleteOutlineIcon fontSize="small" className="text-red-400" />
                  </IconButton>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2">
              <TextField
                size="small"
                label="Yangi qo'shish"
                placeholder={section.placeholder}
                value={drafts[section.kind] ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [section.kind]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void add(section.kind);
                  }
                }}
                fullWidth
              />
              <Button
                variant="outlined"
                startIcon={busy === section.kind ? <CircularProgress size={16} /> : <AddIcon />}
                disabled={busy === section.kind || (drafts[section.kind] ?? "").trim().length < 2}
                onClick={() => add(section.kind)}
                className="!shrink-0"
              >
                Qo&apos;shish
              </Button>
            </div>
          </div>
        );
      })}
      {/* Qayta nomlash oynasi */}
      <Dialog open={editing !== null} onClose={() => setEditing(null)} fullWidth maxWidth="xs">
        <DialogTitle>Nomini o&apos;zgartirish</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Yangi nom"
            value={editing?.label ?? ""}
            onChange={(e) => setEditing((prev) => (prev ? { ...prev, label: e.target.value } : prev))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void rename();
              }
            }}
            fullWidth
          />
          <p className="mt-2 text-xs text-navy-300">
            Faqat ko&apos;rinadigan nom o&apos;zgaradi — mahsulotlar shu turda qolaveradi.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Bekor qilish</Button>
          <Button
            variant="contained"
            onClick={rename}
            disabled={busy !== null || (editing?.label.trim().length ?? 0) < 2}
          >
            Saqlash
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
