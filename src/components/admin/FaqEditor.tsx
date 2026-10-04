"use client";

import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, IconButton, TextField } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { MAX_FAQ_ITEMS, type FaqItem } from "@/types/site-pages";

/**
 * "SAVOL-JAVOB" SAHIFASI MATNI (`/savol-javob`).
 *
 * Admin hali saqlamagan bo'lsa forma sozlamadan yasalgan STANDART
 * savollar bilan to'ldiriladi — ularni tahrirlab saqlasangiz, shundan
 * keyin sahifada aynan siz yozgani chiqadi.
 */
export function FaqEditor() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/faq")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: FaqItem[]; saved?: boolean; defaults?: FaqItem[] } | null) => {
        if (cancelled || !data) return;
        setSaved(data.saved === true);
        setItems(data.saved ? (data.items ?? []) : (data.defaults ?? []));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (index: number, patch: Partial<FaqItem>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const move = (index: number, delta: number) =>
    setItems((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  const save = async () => {
    setMessage(null);
    setSaving(true);
    try {
      const faq = items
        .map((item) => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
          questionRu: item.questionRu?.trim() || undefined,
          answerRu: item.answerRu?.trim() || undefined,
        }))
        .filter((item) => item.question || item.answer);
      const res = await fetch("/api/admin/faq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faq }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; items?: FaqItem[] };
      if (!res.ok) throw new Error(body.error ?? "Saqlanmadi.");
      if (body.items) setItems(body.items);
      setSaved(true);
      setMessage({ kind: "success", text: "Saqlandi. Sahifa bir daqiqada yangilanadi." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {!saved && (
        <Alert severity="info">
          Hali saqlanmagan — saytda hozir shu STANDART savollar chiqmoqda (javoblar yetkazish va to&apos;lov
          sozlamasidan yasalgan). Tahrirlab &laquo;Saqlash&raquo; ni bosing.
        </Alert>
      )}

      {items.map((item, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-navy-500 dark:text-navy-100">{index + 1}-savol</span>
            <div>
              <IconButton size="small" aria-label="Yuqoriga" onClick={() => move(index, -1)} disabled={index === 0}>
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label="Pastga"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
              >
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label="O'chirish"
                onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
          <TextField
            size="small"
            label="Savol"
            value={item.question}
            onChange={(e) => update(index, { question: e.target.value })}
            inputProps={{ maxLength: 200 }}
          />
          <TextField
            size="small"
            label="Javob"
            value={item.answer}
            onChange={(e) => update(index, { answer: e.target.value })}
            multiline
            minRows={2}
            inputProps={{ maxLength: 2000 }}
          />
          <details>
            <summary className="cursor-pointer text-xs text-navy-400">Ruscha (ixtiyoriy — bo&apos;lmasa /ru da o&apos;zbekchasi)</summary>
            <div className="mt-3 flex flex-col gap-3">
              <TextField
                size="small"
                label="Вопрос"
                value={item.questionRu ?? ""}
                onChange={(e) => update(index, { questionRu: e.target.value })}
                inputProps={{ maxLength: 200 }}
              />
              <TextField
                size="small"
                label="Ответ"
                value={item.answerRu ?? ""}
                onChange={(e) => update(index, { answerRu: e.target.value })}
                multiline
                minRows={2}
                inputProps={{ maxLength: 2000 }}
              />
            </div>
          </details>
        </div>
      ))}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outlined"
          onClick={() => setItems((current) => [...current, { question: "", answer: "" }])}
          disabled={items.length >= MAX_FAQ_ITEMS}
        >
          Savol qo&apos;shish
        </Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
      </div>
      {message && <Alert severity={message.kind}>{message.text}</Alert>}
    </div>
  );
}
