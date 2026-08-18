"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Alert, Button, Checkbox, CircularProgress, TextField } from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { formatSom, formatDate } from "@/lib/format";

/**
 * O'CHIRILGANLAR SAVATI.
 *
 * Ommaviy o'chirish bir bosishda 200 tagacha mahsulotni yo'q qilardi -
 * "rasmsizlar" filtri bilan o'chirilgach ularni qaytarishning iloji
 * qolmasdi. Endi o'chirilgan mahsulot shu yerda 30 kun turadi:
 * tiklanadi yoki butunlay o'chiriladi, muddat o'tsa o'zi yo'qoladi.
 */

interface TrashedItem {
  id: string;
  name: string;
  sku: string;
  code: number | null;
  category: string;
  brand: string;
  price: number;
  stock: number;
  thumbnailUrl: string;
  imageCount: number;
  deletedAt: number;
  deletedBy: string;
  /** Muddat tugashiga necha kun qoldi (serverda hisoblanadi). */
  daysLeft: number;
}

export function TrashPanel() {
  const [items, setItems] = useState<TrashedItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/products/trash");
      if (!res.ok) throw new Error("Ro'yxatni olishda xatolik.");
      const data = (await res.json()) as { products: TrashedItem[] };
      setItems(data.products);
      setSelected(new Set());
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
      setItems([]);
    }
  };

  useEffect(() => {
    // Yuklash renderdan keyin boshlanadi (React ortiqcha renderlardan
    // ogohlantirmasin).
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, []);

  const run = async (action: "restore" | "purge") => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (action === "purge" && !confirm(`${ids.length} ta mahsulot BUTUNLAY o'chiriladi. Davom etamizmi?`)) {
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/products/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        restored?: number;
        purged?: number;
        note?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Bajarilmadi.");
      setMessage({
        kind: "ok",
        text:
          action === "restore"
            ? `♻️ ${data.restored} ta mahsulot tiklandi. ${data.note ?? ""}`
            : `🗑 ${data.purged} ta mahsulot butunlay o'chirildi.`,
      });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(false);
    }
  };

  if (!items) {
    return (
      <div className="flex justify-center p-6">
        <CircularProgress size={24} />
      </div>
    );
  }

  const term = query.trim().toLowerCase();
  const filtered = term
    ? items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.sku.toLowerCase().includes(term) ||
          String(item.code ?? "").includes(term)
      )
    : items;

  return (
    <div className="flex flex-col gap-4">
      {message && <Alert severity={message.kind === "ok" ? "success" : "error"}>{message.text}</Alert>}

      {items.length === 0 ? (
        <p className="text-sm text-navy-300">Savat bo&apos;sh — o&apos;chirilgan mahsulot yo&apos;q.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <TextField
              size="small"
              label="Qidirish (nom, kod)"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="!w-64"
            />
            <Button
              size="small"
              onClick={() => setSelected(new Set(filtered.map((item) => item.id)))}
            >
              Hammasini belgilash ({filtered.length})
            </Button>
            {selected.size > 0 && (
              <>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<RestoreIcon />}
                  disabled={busy}
                  onClick={() => run("restore")}
                >
                  Tiklash ({selected.size})
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteForeverIcon />}
                  disabled={busy}
                  onClick={() => run("purge")}
                >
                  Butunlay o&apos;chirish
                </Button>
              </>
            )}
            {busy && <CircularProgress size={20} />}
          </div>

          <div className="overflow-x-auto rounded-xl2 border border-navy-100 dark:border-navy-500">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="bg-navy-50 text-left text-xs uppercase text-navy-300 dark:bg-navy-800">
                <tr>
                  <th className="p-2"> </th>
                  <th className="p-2">Mahsulot</th>
                  <th className="p-2">Narx</th>
                  <th className="p-2">O&apos;chirilgan</th>
                  <th className="p-2">Qoldi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t border-navy-100 dark:border-navy-500">
                    <td className="p-2">
                      <Checkbox
                        size="small"
                        checked={selected.has(item.id)}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          })
                        }
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {item.thumbnailUrl ? (
                          <Image
                            src={item.thumbnailUrl}
                            alt=""
                            width={36}
                            height={36}
                            className="h-9 w-9 rounded object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded bg-navy-100 text-[10px] text-navy-300 dark:bg-navy-800">
                            rasm yo&apos;q
                          </span>
                        )}
                        <div>
                          <p className="line-clamp-1 font-medium text-navy-900 dark:text-white">
                            {item.name}
                          </p>
                          <p className="text-xs text-navy-300">
                            {item.code ? `№${item.code}` : ""} {item.sku} {item.brand}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 whitespace-nowrap">{formatSom(item.price)}</td>
                    <td className="p-2 whitespace-nowrap text-xs text-navy-300">
                      {formatDate(item.deletedAt)}
                      <br />
                      {item.deletedBy}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <span
                        className={
                          item.daysLeft <= 3 ? "font-semibold text-red-500" : "text-navy-300"
                        }
                      >
                        {item.daysLeft} kun
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
