"use client";

import { useState } from "react";
import { TextField, Button, Alert, CircularProgress, IconButton, Snackbar } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { useChallenge } from "./ChallengeDialog";
import type { TelegramTopicConfig } from "@/types/telegram";
import type { RequiredChannel } from "@/lib/telegram/required-channels";

interface BotSettingsFormProps {
  initialConfig: TelegramTopicConfig;
  initialChannels: RequiredChannel[];
  initialChannelId: string;
}

export function BotSettingsForm({ initialConfig, initialChannels, initialChannelId }: BotSettingsFormProps) {
  const [orders, setOrders] = useState(String(initialConfig.orders));
  const [contact, setContact] = useState(String(initialConfig.contact));
  const [subscribers, setSubscribers] = useState(String(initialConfig.subscribers));
  const [actions, setActions] = useState(String(initialConfig.actions));
  const [intake, setIntake] = useState(String(initialConfig.intake));
  const [channelId, setChannelId] = useState(initialChannelId);
  const [channels, setChannels] = useState<RequiredChannel[]>(initialChannels);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  /** Webhook'ni qayta o'rnatish holati. */
  const [isHooking, setIsHooking] = useState(false);
  const [hookNote, setHookNote] = useState<string | null>(null);
  /** Kanaldagi eski postlarni yangilash holati. */
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const challenge = useChallenge();

  const updateChannel = (index: number, field: keyof RequiredChannel, value: string) => {
    setChannels((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  /**
   * WEBHOOK'NI QAYTA O'RNATISH. Sayt domeni o'zgarganda (hosting
   * almashtirilganda) Telegram eski manzilga xabar yuborib turadi va
   * bot "jim" bo'lib qoladi - shu tugma uni joriy domenga qaytadan
   * bog'laydi.
   */
  const resetWebhook = async () => {
    setIsHooking(true);
    setHookNote(null);
    try {
      const res = await fetch("/api/admin/telegram/webhook", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Webhook o'rnatilmadi.");
      setHookNote(`✅ Webhook o'rnatildi: ${data.url}`);
    } catch (err) {
      setHookNote(`❌ ${err instanceof Error ? err.message : "Webhook o'rnatilmadi."}`);
    } finally {
      setIsHooking(false);
    }
  };

  /**
   * Kanaldagi eski postlarni joyida yangilaydi (havola eski domenga
   * qarab qolgan bo'lsa). Yangi post tashlanmaydi.
   */
  const refreshChannelPosts = async () => {
    setIsRefreshing(true);
    setRefreshNote(null);
    try {
      const res = await fetch("/api/admin/telegram/refresh-channel", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        scanned?: number;
        updated?: number;
        unchanged?: number;
        failed?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Yangilanmadi.");
      setRefreshNote(
        `✅ ${data.updated ?? 0} ta post yangilandi` +
          (data.unchanged ? `, ${data.unchanged} tasi allaqachon joyida` : "") +
          (data.failed ? `, ${data.failed} tasiga Telegram ruxsat bermadi` : "")
      );
    } catch (err) {
      setRefreshNote(`❌ ${err instanceof Error ? err.message : "Yangilanmadi."}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    // Saqlashdan oldin jumboq: tasodifiy (yoki begona) o'zgartirishning
    // oldini oladi. Javob server tomonda tekshiriladi.
    const answer = await challenge.ask();
    if (!answer) return;

    setIsSaving(true);
    setResult(null);
    try {
      const cleanChannels = channels
        .map((c) => ({ chatId: c.chatId.trim(), title: c.title.trim(), url: c.url.trim() }))
        .filter((c) => c.chatId);

      // Yozuv server API orqali (Admin SDK) - client Firestore yozuvi
      // admin panelda osilib qoladi.
      const res = await fetch("/api/admin/telegram-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orders: Number(orders) || 0,
          contact: Number(contact) || 0,
          subscribers: Number(subscribers) || 0,
          actions: Number(actions) || 0,
          intake: Number(intake) || 0,
          channelId: channelId.trim(),
          requiredChannels: cleanChannels,
          ...answer,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Saqlashda xatolik yuz berdi.");
      setResult("success");
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Saqlashda xatolik yuz berdi.");
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
        <TextField
          label="#Kirim (mahsulot qo'shish) - Thread ID"
          type="number"
          value={intake}
          onChange={(e) => setIntake(e.target.value)}
          helperText="Shu topic'ga rasm + izoh tashlansa, bot mahsulotni katalogga qo'shadi. 0 - o'chirilgan."
        />
      </div>

      {/* E'lon kanali */}
      <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <div>
          <h2 className="font-semibold text-navy-900 dark:text-white">E&apos;lon kanali</h2>
          <p className="mt-1 text-xs text-navy-300">
            Yangi mahsulot va blog postlari (saytdan ham, adminlar guruhidan ham) shu kanalga
            avtomatik chiqadi. Bot kanalda <b>admin</b> bo&apos;lishi kerak. Bo&apos;sh qoldirilsa —
            Netlify&apos;dagi <code>TELEGRAM_CHANNEL_ID</code> qiymati ishlatiladi.
          </p>
        </div>
        <TextField
          label="Kanal ID yoki @username"
          placeholder="@atoyo_kanal yoki -1001234567890"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
        />
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

      {/* Webhook - sayt domeni o'zgarganda qayta bog'lash kerak. */}
      <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <div>
          <h2 className="font-semibold text-navy-900 dark:text-white">Telegram webhook</h2>
          <p className="mt-1 text-xs text-navy-300">
            Bot xabarlarni shu saytga yuboradi. Sayt manzili o&apos;zgargan bo&apos;lsa (hosting
            almashtirilganda) bot jim bo&apos;lib qoladi — shu tugma uni joriy manzilga
            qaytadan bog&apos;laydi.
          </p>
        </div>
        <Button
          type="button"
          variant="outlined"
          onClick={resetWebhook}
          disabled={isHooking}
          className="!w-fit"
        >
          {isHooking ? <CircularProgress size={20} /> : "Webhook'ni qayta o'rnatish"}
        </Button>
        {hookNote && (
          <p className="break-all text-xs text-navy-300">{hookNote}</p>
        )}

        <div className="border-t border-navy-100 pt-3 dark:border-navy-500">
          <p className="mb-2 text-xs text-navy-300">
            Kanaldagi <b>eski postlar</b> havolasi ham eski manzilda qolgan bo&apos;lishi mumkin.
            Bu tugma ularni joyida tahrirlaydi — yangi post tashlanmaydi, obunachilarga
            takror xabar bormaydi. Postlar ko&apos;p bo&apos;lsa bir necha marta bosing
            (har safar 40 tasi yangilanadi).
          </p>
          <Button
            type="button"
            variant="outlined"
            onClick={refreshChannelPosts}
            disabled={isRefreshing}
            className="!w-fit"
          >
            {isRefreshing ? <CircularProgress size={20} /> : "Kanal postlarini yangilash"}
          </Button>
          {refreshNote && <p className="mt-2 text-xs text-navy-300">{refreshNote}</p>}
        </div>
      </div>

      {errorText && <Alert severity="error">{errorText}</Alert>}

      <Button type="submit" variant="contained" disabled={isSaving} className="!w-fit">
        {isSaving ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
      </Button>

      {challenge.dialog}

      <Snackbar
        open={result !== null}
        autoHideDuration={4000}
        onClose={() => setResult(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        {result ? (
          <Alert severity={result} variant="filled" onClose={() => setResult(null)} sx={{ width: "100%" }}>
            {result === "success" ? "Bot sozlamalari saqlandi." : (errorText ?? "Saqlashda xatolik yuz berdi.")}
          </Alert>
        ) : undefined}
      </Snackbar>
    </form>
  );
}
