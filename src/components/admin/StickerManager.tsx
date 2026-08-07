"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { STICKER_ICONS, STICKER_ICON_LABELS } from "@/lib/stickers/icons";
import {
  STICKER_AI_MODE_HINTS,
  STICKER_AI_MODE_LABELS,
  type StickerAiMode,
} from "@/lib/stickers/ai-modes";
import {
  STICKER_SLOTS,
  STICKER_SLOT_INFO,
  STICKER_TEMPLATE_LABELS,
  type StickerInfo,
  type StickerSettings,
  type StickerSlot,
  type StickerTemplate,
} from "@/types/sticker";

/**
 * BOT STIKERLARI.
 *
 * Ikki qism:
 *   1) SLOTLAR — qaysi daqiqada qaysi stiker yuborilishi;
 *   2) YASASH — saytda stiker chizib, bot to'plamiga qo'shish
 *      (animatsiyali stikerni tayyor `.tgs`/`.webm` fayl sifatida
 *      yuklash mumkin — uni brauzer yasay olmaydi).
 */

interface Pack {
  name: string;
  stickers: StickerInfo[];
  error?: string;
}

const TEMPLATES = Object.keys(STICKER_TEMPLATE_LABELS) as StickerTemplate[];

export function StickerManager() {
  const [settings, setSettings] = useState<StickerSettings | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error" | "info"; text: string } | null>(null);

  /** Tanlangan slot - stiker bosilganda shunga biriktiriladi. */
  const [target, setTarget] = useState<StickerSlot>("start");

  /** Yangi to'plam qo'shish (mavjud "Atoyo stickers" ni ko'rish uchun). */
  const [newPack, setNewPack] = useState("");
  const [ownerId, setOwnerId] = useState("");

  /** AI studiyasi. */
  const [aiEnabled, setAiEnabled] = useState(false);
  const [ai, setAi] = useState({
    mode: "template" as StickerAiMode,
    idea: "",
    outline: 14,
    referenceFileId: "",
    imageBase64: "",
  });
  const [aiResult, setAiResult] = useState<string | null>(null);

  /** Stiker yasash formasi. */
  const [design, setDesign] = useState({
    template: "circle" as StickerTemplate,
    text: "RAHMAT",
    subtitle: "",
    icon: "check",
    withLogo: true,
    emoji: "🙏",
  });
  /** AI chizgan rasm shablon ichiga qo'yilganda shu yerda turadi. */
  const [designArt, setDesignArt] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/stickers");
      if (!res.ok) throw new Error("Sozlama o'qilmadi.");
      const data = (await res.json()) as { settings: StickerSettings; packs: Pack[] };
      setSettings(data.settings);
      setPacks(data.packs);
      setOwnerId(data.settings.ownerUserId ? String(data.settings.ownerUserId) : "");
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
      // AI kaliti bor-yo'qligi - bo'lmasa studiya ko'rsatilmaydi.
      void fetch("/api/admin/stickers/ai")
        .then((res) => (res.ok ? res.json() : { enabled: false }))
        .then((data: { enabled?: boolean }) => setAiEnabled(Boolean(data.enabled)))
        .catch(() => setAiEnabled(false));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  /** Barcha stikerlar - `file_id` bo'yicha ko'rish uchun. */
  const byFileId = useMemo(() => {
    const map = new Map<string, StickerInfo>();
    for (const pack of packs) for (const item of pack.stickers) map.set(item.fileId, item);
    return map;
  }, [packs]);

  const save = async (body: Record<string, unknown>, note: string) => {
    setBusy("save");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/stickers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        settings?: StickerSettings;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Saqlanmadi.");
      if (data.settings) setSettings(data.settings);
      setMessage({ kind: "ok", text: note });
      // To'plam qo'shilgan bo'lsa ro'yxatni qayta o'qiymiz.
      if ("extraPacks" in body || "packName" in body) await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
    }
  };

  const assign = (fileId: string) =>
    save(
      { slot: target, fileId },
      `Stiker biriktirildi: ${STICKER_SLOT_INFO[target].label}`
    );

  const clearSlot = (slot: StickerSlot) =>
    save({ slot, fileId: "" }, `${STICKER_SLOT_INFO[slot].label} — stiker olib tashlandi.`);

  const addPack = () => {
    const name = newPack.trim().replace(/^https?:\/\/t\.me\/addstickers\//i, "");
    if (!name || !settings) return;
    setNewPack("");
    void save({ extraPacks: [...settings.extraPacks, name] }, `To'plam qo'shildi: ${name}`);
  };

  /** Yasalgan stikerni Telegram to'plamiga qo'shish. */
  const createSticker = async () => {
    setBusy("create");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/stickers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "design", ...design, artDataUrl: designArt ?? undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        link?: string;
        created?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Stiker qo'shilmadi.");
      setMessage({
        kind: "ok",
        text: `${data.created ? "To'plam yaratildi va stiker qo'shildi" : "Stiker to'plamga qo'shildi"}: ${data.link}`,
      });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
    }
  };

  /** Tayyor .tgs / .webm faylni to'plamga qo'shish. */
  const uploadSticker = async (file: File) => {
    setBusy("upload");
    setMessage(null);
    try {
      const isVideo = file.name.toLowerCase().endsWith(".webm");
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Fayl o'qilmadi."));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/admin/stickers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "upload",
          data,
          fileName: file.name,
          format: isVideo ? "video" : "animated",
          emoji: design.emoji,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { link?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Fayl qabul qilinmadi.");
      setMessage({ kind: "ok", text: `Animatsiyali stiker qo'shildi: ${body.link}` });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
    }
  };

  /** AI stiker yasash (natija darhol to'plamga tushmaydi). */
  const runAi = async () => {
    setBusy("ai");
    setMessage(null);
    setAiResult(null);
    try {
      const res = await fetch("/api/admin/stickers/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: ai.mode,
          idea: ai.idea,
          outline: ai.outline,
          referenceFileId: ai.mode === "style" ? ai.referenceFileId || undefined : undefined,
          imageBase64: ai.mode === "photo" ? ai.imageBase64 || undefined : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        image?: string;
        bytes?: number;
        error?: string;
      };
      if (!res.ok || !data.image) throw new Error(data.error ?? "Stiker yasalmadi.");
      setAiResult(data.image);
      setMessage({
        kind: "info",
        text: `Tayyor (${Math.round((data.bytes ?? 0) / 1024)}KB). Ma'qul bo'lsa "To'plamga qo'shish" ni bosing.`,
      });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
    }
  };

  /** AI yasagan stikerni Telegram to'plamiga qo'shish. */
  const addAiToPack = async () => {
    if (!aiResult) return;
    setBusy("ai-add");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/stickers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "upload",
          data: aiResult,
          fileName: "atoyo-ai.webp",
          format: "static",
          emoji: design.emoji,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { link?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Qo'shilmadi.");
      setMessage({ kind: "ok", text: `Stiker to'plamga qo'shildi: ${data.link}` });
      setAiResult(null);
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
    }
  };

  const previewUrl = `/api/admin/stickers/preview?template=${design.template}&text=${encodeURIComponent(
    design.text
  )}&subtitle=${encodeURIComponent(design.subtitle)}&icon=${design.icon}&logo=${
    design.withLogo ? "1" : "0"
  }`;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {message && <Alert severity={message.kind === "ok" ? "success" : message.kind}>{message.text}</Alert>}

      {/* ---------- 1) SLOTLAR ---------- */}
      <section>
        <h2 className="mb-1 text-lg font-bold text-navy-900 dark:text-white">
          Qaysi daqiqada qaysi stiker
        </h2>
        <p className="mb-4 text-sm text-navy-300">
          Pastdagi to&apos;plamdan stiker bosilsa — u <b>tanlangan slotga</b> biriktiriladi.
          Slot bo&apos;sh bo&apos;lsa bot avvalgidek faqat matn yuboradi.
        </p>

        <div className="grid gap-2 md:grid-cols-2">
          {STICKER_SLOTS.map((slot) => {
            const fileId = settings?.slots?.[slot];
            const info = STICKER_SLOT_INFO[slot];
            const sticker = fileId ? byFileId.get(fileId) : undefined;
            return (
              <div
                key={slot}
                className={`flex items-center gap-3 rounded-xl2 border p-3 ${
                  target === slot
                    ? "border-aqua-500 bg-aqua-50 dark:bg-navy-600"
                    : "border-navy-100 dark:border-navy-500"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setTarget(slot)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-navy-50 dark:bg-navy-700">
                    {sticker ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sticker.previewUrl} alt={info.label} className="h-full w-full object-contain" />
                    ) : fileId ? (
                      <span className="text-[10px] text-navy-300">bor</span>
                    ) : (
                      <span className="text-[10px] text-navy-300">bo&apos;sh</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900 dark:text-white">{info.label}</p>
                    <p className="text-xs text-navy-300">{info.when}</p>
                  </div>
                </button>
                {fileId && (
                  <Button size="small" color="error" onClick={() => void clearSlot(slot)} disabled={busy !== null}>
                    <DeleteOutlineIcon fontSize="small" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-sm font-medium text-aqua-600 dark:text-aqua-300">
          Tanlangan slot: {STICKER_SLOT_INFO[target].label}
        </p>
      </section>

      {/* ---------- 2) TO'PLAMLAR ---------- */}
      <section>
        <h2 className="mb-1 text-lg font-bold text-navy-900 dark:text-white">To&apos;plamlar</h2>
        <p className="mb-3 text-sm text-navy-300">
          Mavjud to&apos;plam nomini qo&apos;shing (masalan <code>AtoyoStickers</code> yoki to&apos;liq
          havola). Xodimlar guruhiga stiker tashlasangiz, bot to&apos;plamni <b>o&apos;zi</b> qo&apos;shadi.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <TextField
            size="small"
            label="To'plam nomi yoki havolasi"
            placeholder="t.me/addstickers/AtoyoStickers"
            value={newPack}
            onChange={(event) => setNewPack(event.target.value)}
            className="min-w-[280px]"
          />
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addPack} disabled={busy !== null}>
            Qo&apos;shish
          </Button>
        </div>

        {packs.length === 0 && (
          <Alert severity="info">
            Hali to&apos;plam qo&apos;shilmagan. Yuqoridagi maydonga to&apos;plam nomini yozing yoki
            xodimlar guruhiga bitta stiker tashlang.
          </Alert>
        )}

        {/* Bot to'plami BIRINCHI stiker qo'shilganda yaratiladi -
            shungacha havola ishlamaydi ("Stickers not found"). */}
        {settings?.packName && !packs.some((pack) => pack.name === settings.packName && !pack.error) && (
          <Alert severity="warning" className="!mb-4">
            Bot to&apos;plami (<code>{settings.packName}</code>) hali <b>yaratilmagan</b> — u
            birinchi stiker qo&apos;shilganda paydo bo&apos;ladi. Shungacha
            <code> t.me/addstickers/{settings.packName}</code> havolasi &quot;Stickers not
            found&quot; deydi. Pastdagi bo&apos;limdan bitta stiker yasab qo&apos;shing.
          </Alert>
        )}

        {packs.map((pack) => (
          <div key={pack.name} className="mb-4">
            <p className="mb-2 text-sm font-semibold text-navy-900 dark:text-white">
              {pack.name}
              {pack.name === settings?.packName && (
                <Chip size="small" label="bot to'plami" className="!ml-2" color="primary" />
              )}
            </p>
            {pack.error ? (
              <Alert severity="warning">{pack.error}</Alert>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pack.stickers.map((sticker) => (
                  <button
                    key={sticker.fileId}
                    type="button"
                    onClick={() => void assign(sticker.fileId)}
                    disabled={busy !== null}
                    title={`"${STICKER_SLOT_INFO[target].label}" slotiga biriktirish`}
                    className="relative h-20 w-20 overflow-hidden rounded-lg border border-navy-100 bg-white p-1 transition hover:border-aqua-500 dark:border-navy-500 dark:bg-navy-600"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sticker.previewUrl} alt={sticker.emoji} className="h-full w-full object-contain" />
                    {(sticker.isAnimated || sticker.isVideo) && (
                      <span className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[9px] text-white">
                        {sticker.isVideo ? "video" : "anim"}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* ---------- 3) AI STUDIYASI ---------- */}
      {aiEnabled && (
        <section className="rounded-xl2 border border-aqua-200 bg-aqua-50/50 p-4 dark:border-navy-500 dark:bg-navy-600/40">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-navy-900 dark:text-white">
            <AutoAwesomeIcon fontSize="small" /> AI bilan stiker yasash
          </h2>
          <p className="mb-4 text-sm text-navy-300">
            Sun&apos;iy intellekt rasm chizadi, sayt uni haqiqiy Telegram stikeriga aylantiradi:
            512×512, foni shaffof, atrofida oq chegara. Natija darhol to&apos;plamga tushmaydi —
            avval ko&apos;rasiz.
          </p>

          <div className="grid gap-4 md:grid-cols-[280px_1fr]">
            {/* Natija */}
            <div className="flex flex-col items-center gap-2">
              <div className="h-[240px] w-[240px] rounded-xl2 bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#ffffff_0%_50%)] bg-[length:24px_24px] p-2">
                {aiResult ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={aiResult} alt="AI stiker" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-xs text-navy-300">
                    {busy === "ai" ? "Chizilmoqda…" : "Hali yasalmagan"}
                  </div>
                )}
              </div>
              {aiResult && (
                <div className="flex flex-col gap-1">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => void addAiToPack()}
                    disabled={busy !== null}
                  >
                    {busy === "ai-add" ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      "To'plamga qo'shish"
                    )}
                  </Button>
                  {/* Eng chiroyli natija: AI rasmi + do'kon ramkasi. */}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setDesignArt(aiResult);
                      setMessage({
                        kind: "info",
                        text: "Rasm shablonga qo'yildi — pastda yozuvni yozib, saqlang.",
                      });
                    }}
                    disabled={busy !== null}
                  >
                    Shablon ichiga qo&apos;yish
                  </Button>
                </div>
              )}
            </div>

            {/* Sozlamalari */}
            <div className="flex flex-col gap-3">
              <FormControl size="small" fullWidth>
                <InputLabel id="ai-mode">Nimadan yasalsin</InputLabel>
                <Select
                  labelId="ai-mode"
                  label="Nimadan yasalsin"
                  value={ai.mode}
                  onChange={(event) =>
                    setAi({ ...ai, mode: event.target.value as StickerAiMode })
                  }
                >
                  {(Object.keys(STICKER_AI_MODE_LABELS) as StickerAiMode[]).map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {STICKER_AI_MODE_LABELS[mode]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <p className="-mt-2 text-xs text-navy-300">{STICKER_AI_MODE_HINTS[ai.mode]}</p>

              <TextField
                size="small"
                label="Nima chizilsin"
                placeholder="Kulayotgan santexnik bosh barmog'ini ko'tarib turibdi"
                value={ai.idea}
                onChange={(event) => setAi({ ...ai, idea: event.target.value.slice(0, 300) })}
                multiline
                minRows={2}
                fullWidth
              />

              {ai.mode === "photo" && (
                <Button component="label" variant="outlined" size="small" className="!w-fit">
                  {ai.imageBase64 ? "Surat tanlandi ✓ (almashtirish)" : "Mahsulot suratini tanlash"}
                  <input
                    type="file"
                    hidden
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setAi({ ...ai, imageBase64: String(reader.result) });
                      reader.readAsDataURL(file);
                    }}
                  />
                </Button>
              )}

              {ai.mode === "style" && (
                <div>
                  <p className="mb-1 text-xs font-medium text-navy-500 dark:text-navy-100">
                    Namuna stiker (bosib tanlang)
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {packs.flatMap((pack) => pack.stickers).slice(0, 40).map((sticker) => (
                      <button
                        key={sticker.fileId}
                        type="button"
                        onClick={() => setAi({ ...ai, referenceFileId: sticker.fileId })}
                        className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-white p-1 dark:bg-navy-600 ${
                          ai.referenceFileId === sticker.fileId
                            ? "border-aqua-500 ring-2 ring-aqua-400"
                            : "border-navy-100 dark:border-navy-500"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={sticker.previewUrl} alt="" className="h-full w-full object-contain" />
                      </button>
                    ))}
                    {packs.length === 0 && (
                      <span className="text-xs text-navy-300">Avval to&apos;plam qo&apos;shing.</span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <TextField
                  size="small"
                  type="number"
                  label="Oq chegara (0-40)"
                  value={ai.outline}
                  onChange={(event) =>
                    setAi({ ...ai, outline: Math.max(0, Math.min(40, Number(event.target.value) || 0)) })
                  }
                  className="w-[160px]"
                />
                <TextField
                  size="small"
                  label="Emoji"
                  value={design.emoji}
                  onChange={(event) => setDesign({ ...design, emoji: event.target.value.slice(0, 8) })}
                  className="w-[120px]"
                />
                <Button
                  variant="contained"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={() => void runAi()}
                  disabled={busy !== null}
                >
                  {busy === "ai" ? <CircularProgress size={20} color="inherit" /> : "Yasash"}
                </Button>
              </div>

              <p className="text-xs text-navy-300">
                Model <b>yozuv chizmaydi</b> (harflarni xato yozadi) — yozuvli stiker kerak bo&apos;lsa
                pastdagi shablondan foydalaning. Har bir urinish pul turadi, shuning uchun
                oynani ochiq qoldirib bosaverish shart emas.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ---------- 4) YOZUVLI STIKER (SHABLON) ---------- */}
      <section>
        <h2 className="mb-1 text-lg font-bold text-navy-900 dark:text-white">Yozuvli stiker (shablon)</h2>
        <p className="mb-4 text-sm text-navy-300">
          Yozuvni kiriting — stiker shu yerda chiziladi va bot to&apos;plamiga qo&apos;shiladi.
          Bot faqat <b>o&apos;zi yaratgan</b> to&apos;plamga stiker qo&apos;sha oladi (@Stickers orqali
          yasalgan eski to&apos;plam tahrirlanmaydi).
        </p>

        {!settings?.ownerUserId && (
          <Alert severity="warning" className="!mb-4">
            To&apos;plam egasi belgilanmagan. Xodimlar guruhida <code>/stiker egasi</code> yozing
            yoki Telegram ID ingizni pastga kiriting.
          </Alert>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <TextField
            size="small"
            label="To'plam egasining Telegram ID si"
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value.replace(/\D/g, ""))}
            className="min-w-[240px]"
          />
          <Button
            variant="outlined"
            onClick={() => void save({ ownerUserId: Number(ownerId) || null }, "Egasi saqlandi.")}
            disabled={busy !== null || !ownerId}
          >
            Saqlash
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          {/* Ko'rinishi */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-[280px] w-[280px] rounded-xl2 bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#ffffff_0%_50%)] bg-[length:24px_24px] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Stiker ko'rinishi" className="h-full w-full object-contain" />
            </div>
            <p className="text-xs text-navy-300">512×512 · shaffof fon</p>
          </div>

          {/* Sozlamalari */}
          <div className="flex flex-col gap-3">
            <FormControl size="small" fullWidth>
              <InputLabel id="st-template">Shablon</InputLabel>
              <Select
                labelId="st-template"
                label="Shablon"
                value={design.template}
                onChange={(event) =>
                  setDesign({ ...design, template: event.target.value as StickerTemplate })
                }
              >
                {TEMPLATES.map((template) => (
                  <MenuItem key={template} value={template}>
                    {STICKER_TEMPLATE_LABELS[template]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Asosiy yozuv"
              value={design.text}
              onChange={(event) => setDesign({ ...design, text: event.target.value.slice(0, 60) })}
              helperText="2-3 so'z eng chiroyli chiqadi. Emoji ishlatilmaydi — u alohida tanlanadi."
              fullWidth
            />

            <TextField
              size="small"
              label="Ikkinchi qator (ixtiyoriy)"
              value={design.subtitle}
              onChange={(event) => setDesign({ ...design, subtitle: event.target.value.slice(0, 70) })}
              fullWidth
            />

            {/* Yuqoridagi ikonka - do'kon stikerlaridagi oltin belgi. */}
            {designArt ? (
              <Alert
                severity="info"
                action={
                  <Button size="small" onClick={() => setDesignArt(null)}>
                    Olib tashlash
                  </Button>
                }
              >
                Yuqorida AI chizgan rasm turibdi (ikonka o&apos;rniga).
              </Alert>
            ) : (
              <FormControl size="small" fullWidth>
                <InputLabel id="st-icon">Yuqoridagi ikonka</InputLabel>
                <Select
                  labelId="st-icon"
                  label="Yuqoridagi ikonka"
                  value={design.icon}
                  onChange={(event) => setDesign({ ...design, icon: event.target.value })}
                >
                  <MenuItem value="none">{STICKER_ICON_LABELS.none}</MenuItem>
                  {STICKER_ICONS.map((icon) => (
                    <MenuItem key={icon} value={icon}>
                      {STICKER_ICON_LABELS[icon] ?? icon}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <TextField
                size="small"
                label="Emoji (kayfiyat)"
                value={design.emoji}
                onChange={(event) => setDesign({ ...design, emoji: event.target.value.slice(0, 8) })}
                className="w-[160px]"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={design.withLogo}
                    onChange={(event) => setDesign({ ...design, withLogo: event.target.checked })}
                  />
                }
                label="ATOYO lentasi"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="contained"
                onClick={() => void createSticker()}
                disabled={busy !== null || !design.text.trim()}
              >
                {busy === "create" ? <CircularProgress size={20} color="inherit" /> : "To'plamga qo'shish"}
              </Button>

              <Button component="label" variant="outlined" disabled={busy !== null}>
                {busy === "upload" ? <CircularProgress size={20} /> : "Animatsiyali fayl yuklash"}
                <input
                  type="file"
                  hidden
                  accept=".tgs,.webm"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void uploadSticker(file);
                  }}
                />
              </Button>
            </div>

            <p className="text-xs text-navy-300">
              <b>Animatsiya haqida:</b> Telegram animatsiyali stiker uchun <code>.tgs</code> (Lottie,
              64KB gacha) yoki <code>.webm</code> (VP9, 256KB gacha, 3 soniya) formatini talab qiladi
              — ularni brauzer yasay olmaydi. Dizayner tayyorlagan faylni shu yerda yuklang, sayt uni
              to&apos;plamga qo&apos;shadi.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
