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
  /** Kanal tezligi: oynada nechta post va oyna uzunligi (daqiqa). */
  initialPace: { maxPerWindow: number; windowMinutes: number };
  /** Navbatda kutayotgan postlar soni. */
  initialQueued: number;
}

export function BotSettingsForm({
  initialConfig,
  initialChannels,
  initialChannelId,
  initialPace,
  initialQueued,
}: BotSettingsFormProps) {
  const [orders, setOrders] = useState(String(initialConfig.orders));
  const [contact, setContact] = useState(String(initialConfig.contact));
  const [subscribers, setSubscribers] = useState(String(initialConfig.subscribers));
  const [actions, setActions] = useState(String(initialConfig.actions));
  const [intake, setIntake] = useState(String(initialConfig.intake));
  const [channelId, setChannelId] = useState(initialChannelId);
  const [maxPerWindow, setMaxPerWindow] = useState(String(initialPace.maxPerWindow));
  const [windowMinutes, setWindowMinutes] = useState(String(initialPace.windowMinutes));
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
   * Kanaldagi postlarni mahsulotning HOZIRGI ma'lumotiga moslaydi:
   * nom, narx, tavsif, zaxira va "Saytda ko'rish" havolasi qayta
   * quriladi. Post joyida tahrirlanadi - yangi post tashlanmaydi.
   *
   * Server bir so'rovda 15 tasini oladi va kursor qaytaradi; shu
   * yerda OXIRIGACHA aylanib chiqamiz - admin tugmani qayta-qayta
   * bosib o'tirmasin (ilgari kursor yo'q edi va har bosishda aynan
   * o'sha bo'lak qayta ko'rilardi).
   *
   * TELEGRAM LIMITI sababli har tahrir orasida 3 soniya kutiladi -
   * ya'ni 60 ta post ~3 daqiqa oladi. Shuning uchun jarayon
   * davomida "nechtasi ko'rildi" yozib turiladi.
   */
  const refreshChannelPosts = async () => {
    setIsRefreshing(true);
    setRefreshNote(null);
    try {
      let cursor: string | null = null;
      let updated = 0;
      let unchanged = 0;
      let failed = 0;
      let missing = 0;
      let scanned = 0;
      // Sabab -> nechta post (serverdan o'zbekcha qisqartirilgan holda keladi).
      const reasons: Record<string, number> = {};

      // Cheksiz aylanib qolmaslik uchun qat'iy chegara (15 x 300 = 4500).
      for (let round = 0; round < 300; round++) {
        const url = cursor
          ? `/api/admin/telegram/refresh-channel?after=${encodeURIComponent(cursor)}`
          : "/api/admin/telegram/refresh-channel";
        const res = await fetch(url, { method: "POST" });
        const data = (await res.json().catch(() => ({}))) as {
          scanned?: number;
          updated?: number;
          unchanged?: number;
          failed?: number;
          missing?: number;
          reasons?: Record<string, number>;
          nextCursor?: string | null;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Yangilanmadi.");

        scanned += data.scanned ?? 0;
        updated += data.updated ?? 0;
        unchanged += data.unchanged ?? 0;
        failed += data.failed ?? 0;
        missing += data.missing ?? 0;
        for (const [reason, count] of Object.entries(data.reasons ?? {})) {
          reasons[reason] = (reasons[reason] ?? 0) + count;
        }
        setRefreshNote(
          `⏳ ${scanned} ta post ko'rildi, ${updated} tasi yangilandi… ` +
            "(Telegram limiti sababli sekin ketadi — sahifani yopmang)"
        );

        cursor = data.nextCursor ?? null;
        if (!cursor) break;
      }

      // Sabablarni ko'pdan ozga qarab yozamiz - eng ko'p uchragani birinchi.
      const reasonText = Object.entries(reasons)
        .sort((a, b) => b[1] - a[1])
        .map(([reason, count]) => `${reason} — ${count} ta`)
        .join("; ");

      setRefreshNote(
        `✅ ${scanned} ta postdan ${updated} tasi yangilandi` +
          (unchanged ? `, ${unchanged} tasida o'zgarish yo'q edi` : "") +
          (missing ? `, ${missing} tasining posti o'chirilgan (bog'lanish uzildi, qayta e'lon qilsa bo'ladi)` : "") +
          (failed ? `, ${failed} tasi yiqildi` : "") +
          (reasonText ? `.\nSabab: ${reasonText}` : "")
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
          channelMaxPerWindow: Number(maxPerWindow) || 0,
          channelWindowMinutes: Number(windowMinutes) || 10,
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
            server sozlamasidagi <code>TELEGRAM_CHANNEL_ID</code> qiymati ishlatiladi.
          </p>
        </div>
        <TextField
          label="Kanal ID yoki @username"
          placeholder="@atoyo_kanal yoki -1001234567890"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
        />

        {/* ---- POST TEZLIGI ----
            Bir vaqtda ko'p mahsulot kirim qilinsa kanal spam bo'lib
            ketmasin: chegaradan oshgani navbatga tushadi va oyna
            bo'shashi bilan avtomatik chiqadi. */}
        <div className="mt-2 border-t border-navy-100 pt-4 dark:border-navy-500">
          <h3 className="font-medium text-navy-900 dark:text-white">Post tezligi</h3>
          <p className="mt-1 text-xs text-navy-300">
            Ko&apos;p mahsulot birdan kirim qilinsa kanal to&apos;lib ketmasligi uchun chegara.
            Undan oshgan e&apos;lonlar <b>navbatga</b> tushadi va vaqti kelganda o&apos;zi chiqadi
            — hech biri yo&apos;qolmaydi. <b>0</b> — chegarasiz.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <TextField
              size="small"
              type="number"
              label="Nechta post"
              value={maxPerWindow}
              onChange={(e) => setMaxPerWindow(e.target.value)}
              className="!w-36"
            />
            <TextField
              size="small"
              type="number"
              label="Necha daqiqada"
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(e.target.value)}
              className="!w-40"
            />
            <span className="text-xs text-navy-300">
              Hozir: {maxPerWindow || 0} ta / {windowMinutes || 10} daqiqa
              {initialQueued > 0 ? ` · navbatda ${initialQueued} ta` : ""}
            </span>
          </div>
        </div>
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
            Mahsulot ma&apos;lumoti o&apos;zgarganda (narx, nom, tavsif, zaxira) kanaldagi
            <b> eski post</b> eski holida qolib ketadi. Bu tugma har bir postni
            mahsulotning <b>hozirgi</b> holatidan qayta quradi va joyida tahrirlaydi —
            yangi post tashlanmaydi, obunachilarga takror xabar bormaydi.
            O&apos;zgarish bo&apos;lmagan postlarga tegilmaydi. Bir bosishda hammasi
            oxirigacha aylanib chiqiladi, lekin Telegram bitta kanalga daqiqasiga
            ~20 ta tahrirga ruxsat beradi — shuning uchun jarayon sekin ketadi
            (60 ta post ≈ 3 daqiqa). Tugagunicha sahifani yopmang.
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
          {refreshNote && (
            // Sabablar ro'yxati yangi qatorda chiqadi - `whitespace-pre-line`.
            <p className="mt-2 whitespace-pre-line text-xs text-navy-300">{refreshNote}</p>
          )}
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
