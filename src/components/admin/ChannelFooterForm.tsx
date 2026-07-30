"use client";

import { useState } from "react";
import { Alert, Button, CircularProgress, IconButton, Snackbar, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { ChannelPostFooter, PostLink } from "@/types/content";

/**
 * KANAL POSTI FOOTERI.
 *
 * Har bir mahsulot e'lonining oxirida chiqadigan qism: telefon(lar),
 * do'kon shiori, manzil va havolalar (Telegram kanal, Instagram,
 * YouTube, operator, sayt...). Hammasi shu yerdan tahrirlanadi -
 * post matnini o'zgartirish uchun kodga tegish shart emas.
 */

const SLOGAN_IDEAS = [
  "Sifat narxdan ustun",
  "Santexnikada ishonchli manzil",
  "Bir marta oling — yillab ishlating",
  "Har bir tomchiga mas'ulmiz",
  "Uyingizga issiqlik va qulaylik",
  "Suv ham, issiqlik ham — bizdan",
  "Ustalar tanlagan santexnika",
  "Arzon emas — arziydi",
  "Kafolat bilan — Atoyo bilan",
  "Quvuridan qozonigacha — hammasi bir joyda",
];

export function ChannelFooterForm({ initial }: { initial: ChannelPostFooter }) {
  const [phones, setPhones] = useState<string[]>(initial.phones.length > 0 ? initial.phones : [""]);
  const [slogan, setSlogan] = useState(initial.slogan);
  const [address, setAddress] = useState(initial.address);
  const [links, setLinks] = useState<PostLink[]>(initial.links);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<"success" | "error" | null>(null);

  const updateLink = (index: number, patch: Partial<PostLink>) => {
    setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelFooter: {
            phones: phones.map((p) => p.trim()).filter(Boolean),
            slogan: slogan.trim(),
            address: address.trim(),
            links: links
              .map((l) => ({ title: l.title.trim(), url: l.url.trim() }))
              .filter((l) => l.title && l.url),
          },
        }),
      });
      if (!res.ok) throw new Error("failed");
      setToast("success");
    } catch {
      setToast("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="flex max-w-xl flex-col gap-5">
      {/* Telefonlar */}
      <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <div>
          <h3 className="font-semibold text-navy-900 dark:text-white">Telefon raqamlar</h3>
          <p className="mt-1 text-xs text-navy-300">
            Mahsulot ma&apos;lumotidan keyin, har biri alohida qatorda chiqadi.
          </p>
        </div>

        {phones.map((phone, index) => (
          <div key={index} className="flex items-center gap-2">
            <TextField
              size="small"
              label={`Telefon ${index + 1}`}
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={(e) => setPhones((prev) => prev.map((p, i) => (i === index ? e.target.value : p)))}
              fullWidth
            />
            <IconButton
              aria-label="O'chirish"
              onClick={() => setPhones((prev) => prev.filter((_, i) => i !== index))}
            >
              <DeleteOutlineIcon className="text-red-400" />
            </IconButton>
          </div>
        ))}

        <Button
          type="button"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setPhones((prev) => [...prev, ""])}
          className="!w-fit"
        >
          Telefon qo&apos;shish
        </Button>
      </div>

      {/* Shior va manzil */}
      <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <div>
          <h3 className="font-semibold text-navy-900 dark:text-white">Shior va manzil</h3>
          <p className="mt-1 text-xs text-navy-300">Telefonlardan keyin chiqadi.</p>
        </div>

        <TextField
          size="small"
          label="Shior"
          placeholder="Sifat narxdan ustun"
          value={slogan}
          onChange={(e) => setSlogan(e.target.value)}
          fullWidth
        />

        <div className="flex flex-wrap gap-1">
          {SLOGAN_IDEAS.map((idea) => (
            <Button key={idea} type="button" size="small" variant="text" onClick={() => setSlogan(idea)}>
              {idea}
            </Button>
          ))}
        </div>

        <TextField
          size="small"
          label="Manzil (ixtiyoriy)"
          placeholder="Toshkent, Chilonzor 12"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          fullWidth
        />
      </div>

      {/* Havolalar */}
      <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <div>
          <h3 className="font-semibold text-navy-900 dark:text-white">Havolalar</h3>
          <p className="mt-1 text-xs text-navy-300">
            Postning eng oxirida bir qatorda chiqadi: Telegram · Instagram · YouTube · Operator · Sayt.
          </p>
        </div>

        {links.length === 0 && (
          <p className="text-sm text-navy-300">Havola yo&apos;q. Pastdagi tugma bilan qo&apos;shing.</p>
        )}

        {links.map((link, index) => (
          <div key={index} className="flex items-center gap-2">
            <TextField
              size="small"
              label="Nomi"
              placeholder="Telegram"
              value={link.title}
              onChange={(e) => updateLink(index, { title: e.target.value })}
              className="!w-40"
            />
            <TextField
              size="small"
              label="Havola"
              placeholder="https://t.me/atoyo_uz"
              value={link.url}
              onChange={(e) => updateLink(index, { url: e.target.value })}
              fullWidth
            />
            <IconButton
              aria-label="O'chirish"
              onClick={() => setLinks((prev) => prev.filter((_, i) => i !== index))}
            >
              <DeleteOutlineIcon className="text-red-400" />
            </IconButton>
          </div>
        ))}

        <Button
          type="button"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setLinks((prev) => [...prev, { title: "", url: "" }])}
          className="!w-fit"
        >
          Havola qo&apos;shish
        </Button>
      </div>

      <Button type="submit" variant="contained" disabled={isSaving} className="!w-fit">
        {isSaving ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
      </Button>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast} variant="filled" onClose={() => setToast(null)}>
            {toast === "success" ? "Post footeri saqlandi." : "Saqlashda xatolik."}
          </Alert>
        ) : undefined}
      </Snackbar>
    </form>
  );
}
