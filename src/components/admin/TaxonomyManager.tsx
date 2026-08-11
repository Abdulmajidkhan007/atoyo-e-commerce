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
 * KATEGORIYA / MATERIAL / SOTISH TURI + BREND / DAVLAT ro'yxatlari.
 *
 * Har bir turni qayta nomlash va o'chirish mumkin. Kategoriya, material
 * va sotish turida ichki kalit (slug) o'zgarmaydi, shuning uchun
 * mahsulotlar buzilmaydi. Brend va davlatda esa mahsulotda MATNNING
 * o'zi saqlanadi - qayta nomlash mahsulotlarni ham yangilaydi (server
 * shuni qiladi). O'chirishga esa faqat o'sha qiymat hech qaysi
 * mahsulotda ishlatilmayotgan bo'lsa ruxsat beriladi.
 */

/** Brend/davlat ro'yxatlari (`metadata/facets`) - alohida API. */
type FacetKind = "brands" | "countries";

interface Section {
  /** Ro'yxat kaliti - taxonomy turi yoki facet turi. */
  key: TaxonomyKind | FacetKind;
  source: "taxonomy" | "facet";
  title: string;
  hint: string;
  placeholder: string;
}

const SECTIONS: Section[] = [
  {
    key: "categories",
    source: "taxonomy",
    title: "Kategoriyalar",
    hint: "Katalog bo'limlari. Yangi qo'shilgani mahsulot formasida ham, Telegram kirimida ham darhol ishlaydi.",
    placeholder: "Masalan: Kanalizatsiya",
  },
  {
    key: "materials",
    source: "taxonomy",
    title: "Materiallar",
    hint: "Mahsulot nimadan tayyorlangani. Majburiy emas - bilinmasa bo'sh qoldiriladi.",
    placeholder: "Masalan: Alyuminiy",
  },
  {
    key: "units",
    source: "taxonomy",
    title: "Sotish turlari",
    hint: "Mahsulot nima bilan sotiladi: dona, metr, kg... Narx va zaxira shu birlikda ko'rsatiladi.",
    placeholder: "Masalan: pog'ona",
  },
  {
    key: "brands",
    source: "facet",
    title: "Brendlar",
    hint: "Mahsulot formasida brend shu ro'yxatdan tanlanadi - bir brend uch xil yozilib ketmasin. Qayta nomlansa mahsulotlardagi brend ham yangilanadi.",
    placeholder: "Masalan: Valtec",
  },
  {
    key: "countries",
    source: "facet",
    title: "Ishlab chiqarilgan davlatlar",
    hint: "Mahsulot formasidagi \"Ishlab chiqarilgan davlat\" ro'yxati.",
    placeholder: "Masalan: Turkiya",
  },
];

interface Item {
  /** Ro'yxatdagi kalit: taxonomy'da slug, facet'da matnning o'zi. */
  value: string;
  label: string;
  builtin: boolean;
}

export function TaxonomyManager() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [facets, setFacets] = useState<{ brands: string[]; countries: string[] } | null>(null);
  const [builtinSlugs, setBuiltinSlugs] = useState<Record<string, string[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  /** Qayta nomlash oynasi. */
  const [editing, setEditing] = useState<{ section: Section; value: string; label: string } | null>(
    null
  );

  const load = async () => {
    const [taxRes, facetRes] = await Promise.all([
      fetch("/api/admin/taxonomy"),
      fetch("/api/admin/facets"),
    ]);
    if (taxRes.ok) {
      const data = (await taxRes.json()) as {
        taxonomy: Taxonomy;
        builtinSlugs: Record<string, string[]>;
      };
      setTaxonomy(data.taxonomy);
      setBuiltinSlugs(data.builtinSlugs);
    }
    if (facetRes.ok) {
      const data = (await facetRes.json()) as { facets: { brands: string[]; countries: string[] } };
      setFacets({ brands: data.facets.brands, countries: data.facets.countries });
    }
  };

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      load().catch(() => {
        if (active) setMessage({ type: "error", text: "Ro'yxatlarni o'qib bo'lmadi." });
      });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const itemsOf = (section: Section): Item[] => {
    if (section.source === "facet") {
      const list = facets?.[section.key as FacetKind] ?? [];
      return list.map((value) => ({ value, label: value, builtin: false }));
    }
    const builtin = new Set(builtinSlugs[section.key] ?? []);
    return (taxonomy?.[section.key as TaxonomyKind] ?? []).map((item) => ({
      value: item.slug,
      label: item.label,
      builtin: builtin.has(item.slug),
    }));
  };

  /** Ro'yxat turiga qarab manzil va so'rov tanasi farq qiladi. */
  const request = async (section: Section, method: string, body: Record<string, string>) => {
    const url = section.source === "facet" ? "/api/admin/facets" : "/api/admin/taxonomy";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: section.key, ...body }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; updated?: number };
    if (!res.ok) throw new Error(data.error ?? "Bajarilmadi.");
    return data;
  };

  const add = async (section: Section) => {
    const label = (drafts[section.key] ?? "").trim();
    if (label.length < 2) return;

    setBusy(section.key);
    setMessage(null);
    try {
      await request(section, "POST", section.source === "facet" ? { value: label } : { label });
      setDrafts((prev) => ({ ...prev, [section.key]: "" }));
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
    const { section, value } = editing;
    const label = editing.label.trim();

    setBusy(section.key);
    setMessage(null);
    try {
      const data = await request(
        section,
        "PATCH",
        section.source === "facet" ? { from: value, to: label } : { slug: value, label }
      );
      setEditing(null);
      await load();
      setMessage({
        type: "success",
        text:
          section.source === "facet" && typeof data.updated === "number"
            ? `Nomi yangilandi (${data.updated} ta mahsulotda ham).`
            : "Nomi yangilandi.",
      });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Tahrirlanmadi." });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (section: Section, item: Item) => {
    setBusy(section.key);
    setMessage(null);
    try {
      await request(
        section,
        "DELETE",
        section.source === "facet" ? { value: item.value } : { slug: item.value }
      );
      await load();
      setMessage({ type: "success", text: `"${item.label}" o'chirildi.` });
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
        const items = itemsOf(section);

        return (
          <div
            key={section.key}
            className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700"
          >
            <div>
              <h2 className="font-semibold text-navy-900 dark:text-white">{section.title}</h2>
              <p className="mt-1 text-xs text-navy-300">{section.hint}</p>
            </div>

            {items.length === 0 && (
              <p className="text-xs text-navy-300">Ro&apos;yxat hozircha bo&apos;sh.</p>
            )}

            {/* Brendlar ko'p bo'lishi mumkin - ro'yxat o'z ichida aylanadi. */}
            <ul className="flex max-h-80 flex-col divide-y divide-navy-100 overflow-y-auto dark:divide-navy-500">
              {items.map((item) => (
                <li key={item.value} className="flex items-center gap-2 py-1.5">
                  <span className="flex-1 text-sm text-navy-900 dark:text-white">
                    {item.label}
                    {item.builtin && <span className="ml-2 text-xs text-navy-300">standart</span>}
                  </span>
                  <IconButton
                    size="small"
                    aria-label="Tahrirlash"
                    disabled={busy === section.key}
                    onClick={() => setEditing({ section, value: item.value, label: item.label })}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="O'chirish"
                    disabled={busy === section.key}
                    onClick={() => remove(section, item)}
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
                value={drafts[section.key] ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [section.key]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void add(section);
                  }
                }}
                fullWidth
              />
              <Button
                variant="outlined"
                startIcon={busy === section.key ? <CircularProgress size={16} /> : <AddIcon />}
                disabled={busy === section.key || (drafts[section.key] ?? "").trim().length < 2}
                onClick={() => add(section)}
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
            {editing?.section.source === "facet"
              ? "Bu qiymat mahsulotlarda matn sifatida saqlanadi — mahsulotlardagi nom ham yangilanadi."
              : "Faqat ko'rinadigan nom o'zgaradi — mahsulotlar shu turda qolaveradi."}
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
