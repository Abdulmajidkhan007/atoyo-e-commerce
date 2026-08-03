"use client";

import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, IconButton, TextField } from "@mui/material";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

/**
 * MIJOZNING KARTALARI.
 *
 * Payme merchant kalitlari qo'yilmaguncha `/api/profile/cards`
 * `enabled:false` qaytaradi va bu bo'lim umuman chizilmaydi.
 *
 * Karta raqami faqat serverga (u yerdan Payme'ga) ketadi; qaytib
 * kelgan ma'lumotda niqoblangan raqamdan boshqa hech narsa yo'q.
 */

interface Card {
  id: string;
  maskedNumber: string;
  expire: string;
  verified: boolean;
}

export function SavedCards() {
  const [enabled, setEnabled] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [number, setNumber] = useState("");
  const [expire, setExpire] = useState("");
  const [code, setCode] = useState("");
  /** Kod kutilayotgan karta (tasdiqlash bosqichi). */
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/cards")
      .then((res) => res.json())
      .then((data: { enabled?: boolean; cards?: Card[] }) => {
        if (cancelled) return;
        setEnabled(Boolean(data.enabled));
        setCards(data.cards ?? []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = async () => {
    const res = await fetch("/api/profile/cards");
    const data = await res.json();
    setCards(data.cards ?? []);
  };

  const post = async (body: unknown) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik yuz berdi.");
      return data;
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
      return null;
    } finally {
      setBusy(false);
    }
  };

  if (loading || !enabled) return null;

  const addCard = async () => {
    const digits = number.replace(/\D/g, "");
    if (digits.length < 16) {
      setMessage({ kind: "error", text: "Karta raqamini to'liq kiriting." });
      return;
    }
    const data = await post({ action: "add", number: digits, expire: expire.replace(/\D/g, "") });
    if (data?.card) {
      setPendingId(data.card.id);
      setNumber("");
      setExpire("");
      setMessage({ kind: "ok", text: "Kartaga bog'langan raqamga SMS kod yuborildi." });
      await reload();
    }
  };

  const confirmCard = async () => {
    const data = await post({ action: "verify", cardId: pendingId, code });
    if (data?.card) {
      setPendingId(null);
      setCode("");
      setAdding(false);
      setMessage({ kind: "ok", text: "Karta saqlandi." });
      await reload();
    }
  };

  const deleteCard = async (id: string) => {
    if (!confirm("Karta o'chirilsinmi?")) return;
    setBusy(true);
    await fetch(`/api/profile/cards?id=${id}`, { method: "DELETE" });
    await reload();
    setBusy(false);
  };

  return (
    <div className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy-900 dark:text-white">
        <CreditCardOutlinedIcon fontSize="small" /> Kartalarim
      </h2>

      {message && (
        <Alert severity={message.kind === "ok" ? "success" : "error"} className="mb-3">
          {message.text}
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex items-center justify-between rounded-xl2 border border-navy-100 px-3 py-2 dark:border-navy-500"
          >
            <div>
              <p className="text-sm font-medium text-navy-900 dark:text-white">{card.maskedNumber}</p>
              <p className="text-xs text-navy-300">
                {card.expire} • {card.verified ? "tasdiqlangan" : "tasdiqlanmagan"}
              </p>
            </div>
            <IconButton size="small" disabled={busy} onClick={() => deleteCard(card.id)} aria-label="O'chirish">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </div>
        ))}

        {cards.length === 0 && !adding && (
          <p className="text-sm text-navy-300">
            Saqlangan karta yo&apos;q. Kartani saqlasangiz keyingi buyurtmani bir bosishda to&apos;laysiz.
          </p>
        )}
      </div>

      {/* ---- Karta qo'shish ---- */}
      {adding ? (
        <div className="mt-3 flex flex-col gap-2 rounded-xl2 border border-navy-100 p-3 dark:border-navy-500">
          {pendingId ? (
            <>
              <TextField
                size="small"
                label="SMS kod"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
              />
              <div className="flex gap-2">
                <Button variant="contained" size="small" disabled={busy || code.length < 3} onClick={confirmCard}>
                  {busy ? <CircularProgress size={18} color="inherit" /> : "Tasdiqlash"}
                </Button>
                <Button
                  size="small"
                  disabled={busy}
                  onClick={() => post({ action: "resend", cardId: pendingId })}
                >
                  Kodni qayta yuborish
                </Button>
              </div>
            </>
          ) : (
            <>
              <TextField
                size="small"
                label="Karta raqami"
                placeholder="8600 0000 0000 0000"
                value={number}
                onChange={(event) => setNumber(event.target.value.replace(/[^\d\s]/g, "").slice(0, 19))}
                inputProps={{ inputMode: "numeric", autoComplete: "cc-number" }}
              />
              <TextField
                size="small"
                label="Amal muddati (OO/YY)"
                placeholder="12/28"
                value={expire}
                onChange={(event) => setExpire(event.target.value.replace(/[^\d/]/g, "").slice(0, 5))}
                inputProps={{ inputMode: "numeric", autoComplete: "cc-exp" }}
              />
              <div className="flex gap-2">
                <Button variant="contained" size="small" disabled={busy} onClick={addCard}>
                  {busy ? <CircularProgress size={18} color="inherit" /> : "Kartani saqlash"}
                </Button>
                <Button size="small" onClick={() => setAdding(false)}>
                  Bekor qilish
                </Button>
              </div>
              <p className="text-xs text-navy-300">
                Karta raqami bizda saqlanmaydi — u to&apos;g&apos;ridan-to&apos;g&apos;ri to&apos;lov
                tizimiga yuboriladi.
              </p>
            </>
          )}
        </div>
      ) : (
        <Button size="small" variant="outlined" className="mt-3" onClick={() => setAdding(true)}>
          Karta qo&apos;shish
        </Button>
      )}
    </div>
  );
}
