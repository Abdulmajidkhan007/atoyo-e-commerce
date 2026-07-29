"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Chip, CircularProgress, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { Taxonomy, TaxonomyKind } from "@/lib/products/taxonomy";

/**
 * KATEGORIYA / MATERIAL / SOTISH TURI ro'yxatlari.
 *
 * Standart turlar kodda keladi va o'chirilmaydi (kulrang chip),
 * admin qo'shganlarini o'chirish mumkin - agar ular hech qaysi
 * mahsulotda ishlatilmayotgan bo'lsa (buni server tekshiradi).
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

            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <Chip
                  key={item.slug}
                  label={item.label}
                  variant={builtin.has(item.slug) ? "outlined" : "filled"}
                  onDelete={
                    builtin.has(item.slug)
                      ? undefined
                      : () => remove(section.kind, item.slug, item.label)
                  }
                  disabled={busy === section.kind}
                />
              ))}
            </div>

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
    </div>
  );
}
