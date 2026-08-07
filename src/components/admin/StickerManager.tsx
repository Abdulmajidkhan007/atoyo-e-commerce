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

  /** Stiker yasash formasi. */
  const [design, setDesign] = useState({
    template: "circle" as StickerTemplate,
    text: "RAHMAT",
    subtitle: "",
    withLogo: true,
    emoji: "🙏",
  });

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
    const timer = setTimeout(() => void load(), 0);
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
        body: JSON.stringify({ kind: "design", ...design }),
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

  const previewUrl = `/api/admin/stickers/preview?template=${design.template}&text=${encodeURIComponent(
    design.text
  )}&subtitle=${encodeURIComponent(design.subtitle)}&logo=${design.withLogo ? "1" : "0"}`;

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

      {/* ---------- 3) YANGI STIKER YASASH ---------- */}
      <section>
        <h2 className="mb-1 text-lg font-bold text-navy-900 dark:text-white">Yangi stiker yasash</h2>
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
              onChange={(event) => setDesign({ ...design, subtitle: event.target.value.slice(0, 60) })}
              fullWidth
            />

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
