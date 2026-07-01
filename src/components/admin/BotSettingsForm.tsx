"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { TextField, Button, Alert, CircularProgress } from "@mui/material";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { TelegramTopicConfig } from "@/types/telegram";

export function BotSettingsForm({ initialConfig }: { initialConfig: TelegramTopicConfig }) {
  const [orders, setOrders] = useState(String(initialConfig.orders));
  const [contact, setContact] = useState(String(initialConfig.contact));
  const [subscribers, setSubscribers] = useState(String(initialConfig.subscribers));
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setResult(null);
    try {
      await setDoc(
        doc(getFirebaseDb(), "settings", "telegram"),
        {
          orders: Number(orders),
          contact: Number(contact),
          subscribers: Number(subscribers),
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
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
      <TextField
        label="#Buyurtmalar - Thread ID"
        type="number"
        value={orders}
        onChange={(e) => setOrders(e.target.value)}
      />
      <TextField
        label="#Kontakt - Thread ID"
        type="number"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />
      <TextField
        label="#Obunachilar - Thread ID"
        type="number"
        value={subscribers}
        onChange={(e) => setSubscribers(e.target.value)}
      />

      {result === "success" && <Alert severity="success">Sozlamalar saqlandi.</Alert>}
      {result === "error" && <Alert severity="error">Saqlashda xatolik yuz berdi.</Alert>}

      <Button type="submit" variant="contained" disabled={isSaving}>
        {isSaving ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
      </Button>
    </form>
  );
}
