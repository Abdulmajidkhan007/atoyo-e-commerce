"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { TextField, Button, Alert, CircularProgress, IconButton, Snackbar } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { TelegramTopicConfig } from "@/types/telegram";
import type { RequiredChannel } from "@/lib/telegram/required-channels";

interface BotSettingsFormProps {
  initialConfig: TelegramTopicConfig;
  initialChannels: RequiredChannel[];
}

export function BotSettingsForm({ initialConfig, initialChannels }: BotSettingsFormProps) {
  const [orders, setOrders] = useState(String(initialConfig.orders));
  const [contact, setContact] = useState(String(initialConfig.contact));
  const [subscribers, setSubscribers] = useState(String(initialConfig.subscribers));
  const [actions, setActions] = useState(String(initialConfig.actions));
  const [channels, setChannels] = useState<RequiredChannel[]>(initialChannels);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  const updateChannel = (index: number, field: keyof RequiredChannel, value: string) => {
    setChannels((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setResult(null);
    try {
      const cleanChannels = channels
        .map((c) => ({ chatId: c.chatId.trim(), title: c.title.trim(), url: c.url.trim() }))
        .filter((c) => c.chatId);

      await setDoc(
        doc(getFirebaseDb(), "settings", "telegram"),
        {
          orders: Number(orders),
          contact: Number(contact),
          subscribers: Number(subscribers),
          actions: Number(actions),
          requiredChannels: cleanChannels,
        },
        { merge: true }
      );
      setResult("success");
    } catch {
      setResult("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-6">
      {/* Thread ID lar */}
      <div className="flex flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <h2 className="font-semibold text-navy-900 dark:text-white">Forum topic Thread ID lari</h2>
        <TextField label="#Buyurtmalar - Thread ID" type="number" value={orders} onChange={(e) => setOrders(e.target.value)} />
        <TextField label="#Kontakt - Thread ID" type="number" value={contact} onChange={(e) => setContact(e.target.value)} />
        <TextField label="#Obunachilar - Thread ID" type="number" value={subscribers} onChange={(e) => setSubscribers(e.target.value)} />
        <TextField label="#Actions (hodisalar) - Thread ID" type="number" value={actions} onChange={(e) => setActions(e.target.value)} />
      </div>

      {/* Majburiy kanallar */}
      <div className="flex flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <div>
          <h2 className="font-semibold text-navy-900 dark:text-white">Majburiy obuna kanallari</h2>
          <p className="mt-1 text-xs text-navy-300">
            Mijoz botdan foydalanishdan oldin shu kanallarga obuna bo&apos;lishi shart bo&apos;ladi.
            Bot har bir kanalda <b>admin</b> bo&apos;lishi kerak (obunani tekshira olishi uchun).
          </p>
        </div>

        {channels.length === 0 && (
          <p className="text-sm text-navy-300">Majburiy kanal yo&apos;q. Qo&apos;shish uchun pastdagi tugmani bosing.</p>
        )}

        {channels.map((channel, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-navy-100 p-3 dark:border-navy-500">
            <div className="flex items-center gap-2">
              <TextField
                size="small"
                label="Kanal ID yoki @username"
                placeholder="@atoyo_kanal yoki -1001234567890"
                value={channel.chatId}
                onChange={(e) => updateChannel(index, "chatId", e.target.value)}
                fullWidth
              />
              <IconButton
                aria-label="O'chirish"
                onClick={() => setChannels((prev) => prev.filter((_, i) => i !== index))}
              >
                <DeleteOutlineIcon className="text-red-400" />
              </IconButton>
            </div>
            <TextField size="small" label="Ko'rsatiladigan nom" value={channel.title} onChange={(e) => updateChannel(index, "title", e.target.value)} fullWidth />
            <TextField size="small" label="Havola (https://t.me/...)" value={channel.url} onChange={(e) => updateChannel(index, "url", e.target.value)} fullWidth />
          </div>
        ))}

        <Button
          type="button"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setChannels((prev) => [...prev, { chatId: "", title: "", url: "" }])}
          className="!w-fit"
        >
          Kanal qo&apos;shish
        </Button>
      </div>

      <Button type="submit" variant="contained" disabled={isSaving} className="!w-fit">
        {isSaving ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
      </Button>

      <Snackbar
        open={result !== null}
        autoHideDuration={4000}
        onClose={() => setResult(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        {result ? (
          <Alert severity={result} variant="filled" onClose={() => setResult(null)} sx={{ width: "100%" }}>
            {result === "success" ? "Bot sozlamalari saqlandi." : "Saqlashda xatolik yuz berdi."}
          </Alert>
        ) : undefined}
      </Snackbar>
    </form>
  );
}
