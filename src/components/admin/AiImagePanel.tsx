"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Chip, CircularProgress, TextField } from "@mui/material";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";

/**
 * AI RASM PANELI (faqat mavjud mahsulotni tahrirlashda).
 *
 * Ikki tugma:
 *  - "Rasmni tahlil qilish" - Claude rasmga qarab nom/tavsif/kalit
 *    so'z taklif qiladi (admin qabul qilsa formaga tushadi);
 *  - "Rasm generatsiya qilish" - tanlangan uslublarda yangi savdo
 *    rasmlari (Gemini "Nano Banana"), mahsulotga qo'shiladi.
 *
 * Kalitlar sozlanmagan bo'lsa tegishli tugma ko'rinmaydi.
 */

interface StyleOption {
  key: string;
  label: string;
}

/**
 * Bitta rasmning taxminiy narxi (Gemini image, 2026-yil holati).
 * Panelda ko'rsatiladi - admin tugmani bosishdan oldin qancha pul
 * ketishini bilib turadi.
 */
const PRICE_PER_IMAGE_USD = 0.039;
const USD_TO_UZS = 12600;

export interface AiSuggestion {
  name: string;
  description: string;
  keywords: string[];
  category: string;
  material: string;
  brand: string;
  /** Tarjimalar - bo'sh qolsa forma o'zgarmaydi. */
  nameRu?: string;
  nameEn?: string;
  descriptionRu?: string;
  descriptionEn?: string;
}

interface Props {
  productId: string;
  hasImage: boolean;
  /** Tahlil natijasini formaga tushirish. */
  onSuggestion: (suggestion: AiSuggestion) => void;
  /** Yangi rasmlar mahsulotga qo'shilgach - galereyani yangilash. */
  onImages: (urls: string[]) => void;
}

export function AiImagePanel({ productId, hasImage, onSuggestion, onImages }: Props) {
  const [config, setConfig] = useState<{ analyze: boolean; generate: boolean; styles: StyleOption[] } | null>(null);
  // Standart - bitta uslub: har bosish pul ketishini bildiradi.
  const [selected, setSelected] = useState<string[]>(["studio"]);
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState<"analyze" | "generate" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/admin/products/${productId}/ai-images`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setConfig(data))
      .catch(() => setConfig(null));
  }, [productId]);

  if (!config || (!config.analyze && !config.generate)) return null;

  const run = async (action: "analyze" | "generate") => {
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/ai-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "analyze"
            ? { action: "analyze" }
            : { action: "generate", styles: selected, extraPrompt: extra.trim() || undefined }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik yuz berdi.");

      if (action === "analyze") {
        onSuggestion(data.suggestion as AiSuggestion);
        setMessage({
          type: "success",
          text: "Taklif formaga qo'yildi (ruscha va inglizcha tarjima bilan) — tekshirib saqlang.",
        });
      } else {
        onImages(data.urls as string[]);
        const failed = (data.failed as string[]) ?? [];
        setMessage({
          type: failed.length > 0 ? "info" : "success",
          text:
            `${(data.urls as string[]).length} ta rasm qo'shildi.` +
            (failed.length > 0 ? ` Chiqmagani: ${failed.join(", ")}.` : ""),
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Xatolik yuz berdi." });
    } finally {
      setBusy(null);
    }
  };

  const toggleStyle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key].slice(0, 5)));
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl2 border border-aqua-200 bg-aqua-50/40 p-3 dark:border-navy-500 dark:bg-navy-600/40">
      <p className="text-sm font-medium text-navy-700 dark:text-navy-100">
        AI yordami {hasImage ? "" : "— avval kamida bitta rasm yuklang"}
      </p>

      <div className="flex flex-wrap gap-2">
        {config.analyze && (
          <Button
            variant="outlined"
            size="small"
            startIcon={busy === "analyze" ? <CircularProgress size={14} /> : <PsychologyOutlinedIcon />}
            disabled={!hasImage || busy !== null}
            onClick={() => run("analyze")}
          >
            Rasmni tahlil qilish
          </Button>
        )}

        {config.generate && (
          <Button
            variant="contained"
            size="small"
            startIcon={busy === "generate" ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeOutlinedIcon />}
            disabled={!hasImage || busy !== null || selected.length === 0}
            onClick={() => run("generate")}
          >
            Rasm generatsiya qilish ({selected.length})
          </Button>
        )}
      </div>

      {config.generate && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {config.styles.map((style) => (
              <Chip
                key={style.key}
                label={style.label}
                size="small"
                color={selected.includes(style.key) ? "primary" : "default"}
                variant={selected.includes(style.key) ? "filled" : "outlined"}
                onClick={() => toggleStyle(style.key)}
              />
            ))}
          </div>

          <TextField
            size="small"
            label="Qo'shimcha izoh (ixtiyoriy)"
            placeholder="masalan: quvurni devorga o'rnatilgan holda ko'rsat"
            value={extra}
            onChange={(event) => setExtra(event.target.value.slice(0, 300))}
          />

          <p className="text-xs text-navy-400 dark:text-navy-200">
            Generatsiya asl rasmdagi mahsulotni o&apos;zgartirmaydi — faqat fon, rakurs va muhit yangilanadi.
          </p>

          {/* Xarajat oldindan ko'rinadi - hisobda pul kam bo'lsa muhim. */}
          {selected.length > 0 && (
            <p className="text-xs font-medium text-navy-500 dark:text-navy-100">
              Taxminiy narx: {selected.length} × {Math.round(PRICE_PER_IMAGE_USD * USD_TO_UZS)} so&apos;m ={" "}
              {Math.round(selected.length * PRICE_PER_IMAGE_USD * USD_TO_UZS).toLocaleString("ru-RU")} so&apos;m
            </p>
          )}
        </>
      )}

      {message && <Alert severity={message.type}>{message.text}</Alert>}
    </div>
  );
}
