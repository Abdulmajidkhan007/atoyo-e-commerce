"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Switch,
  TextField,
} from "@mui/material";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import {
  DEFAULT_SOCIAL_SETTINGS,
  SOCIAL_LABELS,
  type SocialJob,
  type SocialSecretsStatus,
  type SocialSettings,
} from "@/types/social";

/**
 * IJTIMOIY TARMOQLAR sozlamasi (admin panel).
 *
 * Uch narsa bir joyda:
 *   1) qaysi tarmoqqa avtomatik post ketadi + post matni shabloni;
 *   2) kalitlar (faqat loyiha egasiga) va ularni tekshirish;
 *   3) navbat holati - nechta post kutmoqda, xatolari.
 */

interface Props {
  /** Kalitlarni faqat loyiha egasi ko'radi/yozadi. */
  owner: boolean;
}

interface QueueState {
  pending: number;
  failed: number;
  recent: SocialJob[];
}

export function SocialSettingsForm({ owner }: Props) {
  /** Google Cloud'ga qo'shiladigan manzil - shu saytning o'zi. */
  const redirectUri =
    typeof window === "undefined"
      ? "https://atoyo-uz.web.app/api/admin/social/youtube/callback"
      : `${window.location.origin}/api/admin/social/youtube/callback`;

  const [settings, setSettings] = useState<SocialSettings>(DEFAULT_SOCIAL_SETTINGS);
  const [secrets, setSecrets] = useState<SocialSecretsStatus | null>(null);
  const [queue, setQueue] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  /** Kalit maydonlari - yozilgani serverga ketadi, qaytarilmaydi. */
  const [keys, setKeys] = useState({
    pageId: "",
    pageAccessToken: "",
    igUserId: "",
    youtubeClientId: "",
    youtubeClientSecret: "",
    youtubeRefreshToken: "",
  });

  /**
   * "YouTube'ga ulanish" dan qaytganda Google natijasi manzil qatorida
   * keladi - uni boshlang'ich holatga o'qib olamiz (effekt ichida
   * setState qilmasdan).
   */
  const [message, setMessageState] = useState<{ kind: "ok" | "error" | "info"; text: string } | null>(
    () => {
      if (typeof window === "undefined") return null;
      const params = new URLSearchParams(window.location.search);
      const ok = params.get("youtube");
      const failed = params.get("youtubeError");
      if (!ok && !failed) return null;
      window.history.replaceState(null, "", window.location.pathname);
      return { kind: failed ? "error" : "ok", text: failed ?? ok ?? "" };
    }
  );
  const setMessage = setMessageState;

  useEffect(() => {
    let active = true;
    fetch("/api/admin/social")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { settings?: SocialSettings; secrets?: SocialSecretsStatus; queue?: QueueState } | null) => {
        if (!active || !data) return;
        if (data.settings) setSettings(data.settings);
        if (data.secrets) setSecrets(data.secrets);
        if (data.queue) setQueue(data.queue);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveSettings = async (patch: Partial<SocialSettings>) => {
    setBusy("settings");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/social", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json().catch(() => ({}))) as { settings?: SocialSettings; error?: string };
      if (!res.ok || !data.settings) throw new Error(data.error ?? "Saqlanmadi.");
      setSettings(data.settings);
      setMessage({ kind: "ok", text: "Sozlama saqlandi." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
    }
  };

  const saveKeys = async () => {
    const patch = Object.fromEntries(Object.entries(keys).filter(([, value]) => value.trim()));
    if (Object.keys(patch).length === 0) return;

    setBusy("keys");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/social/secrets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json().catch(() => ({}))) as {
        secrets?: SocialSecretsStatus;
        error?: string;
      };
      if (!res.ok || !data.secrets) throw new Error(data.error ?? "Saqlanmadi.");
      setSecrets(data.secrets);
      setKeys({
        pageId: "",
        pageAccessToken: "",
        igUserId: "",
        youtubeClientId: "",
        youtubeClientSecret: "",
        youtubeRefreshToken: "",
      });
      setMessage({ kind: "ok", text: "Kalitlar saqlandi." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(null);
    }
  };

  const checkKeys = async () => {
    setBusy("check");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/social/secrets", { method: "POST" });
      const data = (await res.json()) as {
        page?: string;
        instagram?: string;
        youtube?: string;
        errors?: string[];
      };
      const lines = [
        data.page ? `Facebook sahifa: ${data.page}` : "",
        data.instagram ? `Instagram: @${data.instagram}` : "",
        data.youtube ? `YouTube kanal: ${data.youtube}` : "",
        ...(data.errors ?? []),
      ].filter(Boolean);
      setMessage({
        kind: (data.errors?.length ?? 0) > 0 ? "info" : "ok",
        text: lines.join(" · ") || "Kalitlar topilmadi.",
      });
    } catch {
      setMessage({ kind: "error", text: "Tekshirib bo'lmadi." });
    } finally {
      setBusy(null);
    }
  };

  const runQueue = async () => {
    setBusy("queue");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/social/queue", { method: "POST" });
      const data = (await res.json()) as { posted: number; failed: number; queue: QueueState };
      setQueue(data.queue);
      setMessage({
        kind: data.failed > 0 ? "info" : "ok",
        text: `${data.posted} ta post yuborildi${data.failed > 0 ? `, ${data.failed} tasida xato` : ""}.`,
      });
    } catch {
      setMessage({ kind: "error", text: "Navbatni yuborib bo'lmadi." });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <CircularProgress size={24} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700">
      {message && <Alert severity={message.kind === "ok" ? "success" : message.kind}>{message.text}</Alert>}

      {/* Tarmoqlar */}
      <div className="flex flex-wrap items-center gap-4">
        {(["instagram", "facebook", "youtube"] as const).map((network) => (
          <FormControlLabel
            key={network}
            control={
              <Switch
                checked={settings[network]}
                disabled={busy !== null}
                onChange={(event) => void saveSettings({ [network]: event.target.checked })}
              />
            }
            label={
              <span className="flex items-center gap-1">
                {SOCIAL_LABELS[network]}
                {secrets && (
                  <Chip
                    size="small"
                    label={
                      (network === "facebook" ? secrets.facebookPage : secrets[network])
                        ? "sozlangan"
                        : "kalit yo'q"
                    }
                    color={
                      (network === "facebook" ? secrets.facebookPage : secrets[network])
                        ? "success"
                        : "default"
                    }
                    variant="outlined"
                  />
                )}
              </span>
            }
          />
        ))}
      </div>
      <p className="text-xs text-navy-300">
        YouTube&apos;ga faqat <b>videosi bor</b> mahsulot chiqadi (Shorts) — u yerda rasm post
        qilib bo&apos;lmaydi. Instagram va Facebook&apos;ga rasm (bir nechtasi bo&apos;lsa karusel)
        yoki video ketadi.
      </p>

      {/* Post matni */}
      <TextField
        label="Post matni shabloni"
        multiline
        minRows={4}
        value={settings.template}
        onChange={(event) => setSettings({ ...settings, template: event.target.value })}
        onBlur={() => void saveSettings({ template: settings.template })}
        helperText="Belgilar: {nomi} {kodi} {narx} {kategoriya} {brend} {tavsif} {havola}"
        fullWidth
      />
      <div className="flex flex-wrap gap-3">
        <TextField
          label="Heshteglar"
          value={settings.hashtags}
          onChange={(event) => setSettings({ ...settings, hashtags: event.target.value })}
          onBlur={() => void saveSettings({ hashtags: settings.hashtags })}
          sx={{ flex: "1 1 260px" }}
        />
        <TextField
          label="Kunlik chegara"
          type="number"
          value={settings.dailyLimit}
          onChange={(event) =>
            setSettings({ ...settings, dailyLimit: Number(event.target.value) || 0 })
          }
          onBlur={() => void saveSettings({ dailyLimit: settings.dailyLimit })}
          helperText="Instagram 24 soatda 50 tagacha ruxsat beradi"
          sx={{ width: 200 }}
        />
      </div>

      {/* Navbat */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-navy-50 p-3 dark:bg-navy-600/40">
        <span className="text-sm text-navy-500 dark:text-navy-100">
          Navbatda: <b>{queue?.pending ?? 0}</b> ta
          {(queue?.failed ?? 0) > 0 && <> · xatolik: <b>{queue?.failed}</b></>}
        </span>
        <Button
          size="small"
          variant="outlined"
          startIcon={busy === "queue" ? <CircularProgress size={14} /> : <SendOutlinedIcon />}
          disabled={busy !== null}
          onClick={() => void runQueue()}
        >
          Navbatni yuborish
        </Button>
        {queue && queue.recent.length > 0 && (
          <span className="text-xs text-navy-300">
            Oxirgisi: {SOCIAL_LABELS[queue.recent[0]!.network]} — {queue.recent[0]!.productName}
            {queue.recent[0]!.error ? ` (${queue.recent[0]!.error})` : ""}
          </span>
        )}
      </div>

      {/* Kalitlar - faqat egasiga */}
      {owner && (
        <div className="flex flex-col gap-3 border-t border-navy-100 pt-4 dark:border-navy-500">
          <p className="text-sm font-medium text-navy-500 dark:text-navy-100">
            Kalitlar (faqat loyiha egasi ko&apos;radi)
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField
              size="small"
              label="Facebook sahifa ID"
              value={keys.pageId}
              onChange={(event) => setKeys({ ...keys, pageId: event.target.value })}
            />
            <TextField
              size="small"
              label="Sahifa tokeni (uzoq muddatli)"
              type="password"
              value={keys.pageAccessToken}
              onChange={(event) => setKeys({ ...keys, pageAccessToken: event.target.value })}
            />
            <TextField
              size="small"
              label="Instagram User ID"
              value={keys.igUserId}
              onChange={(event) => setKeys({ ...keys, igUserId: event.target.value })}
            />
            <TextField
              size="small"
              label="YouTube Client ID"
              value={keys.youtubeClientId}
              onChange={(event) => setKeys({ ...keys, youtubeClientId: event.target.value })}
            />
            <TextField
              size="small"
              label="YouTube Client Secret"
              type="password"
              value={keys.youtubeClientSecret}
              onChange={(event) => setKeys({ ...keys, youtubeClientSecret: event.target.value })}
            />
            <TextField
              size="small"
              label="YouTube Refresh Token"
              type="password"
              value={keys.youtubeRefreshToken}
              onChange={(event) => setKeys({ ...keys, youtubeRefreshToken: event.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="contained" disabled={busy !== null} onClick={() => void saveKeys()}>
              {busy === "keys" ? <CircularProgress size={20} color="inherit" /> : "Kalitlarni saqlash"}
            </Button>
            <Button variant="outlined" disabled={busy !== null} onClick={() => void checkKeys()}>
              {busy === "check" ? <CircularProgress size={20} /> : "Tekshirish"}
            </Button>
            {/*
              YouTube refresh tokenini qo'lda olish endi ishlamaydi
              (Google "oob" usulini bekor qilgan) - saytning o'zi oladi.
            */}
            <Button
              variant="outlined"
              color="secondary"
              href="/api/admin/social/youtube/connect"
            >
              YouTube&apos;ga ulanish
            </Button>
          </div>
          <p className="text-xs text-navy-300">
            <b>YouTube uchun:</b> Google Cloud&apos;da OAuth mijozi turi{" "}
            <b>&quot;Web application&quot;</b> bo&apos;lsin va &quot;Authorized redirect URIs&quot;
            ga aynan shu manzil qo&apos;shilsin:{" "}
            <code className="break-all">{redirectUri}</code>. Keyin Client ID va Secret ni saqlab,
            &quot;YouTube&apos;ga ulanish&quot; tugmasini bosing — refresh token o&apos;zi
            yoziladi (qo&apos;lda ko&apos;chirish shart emas).
          </p>
          <p className="text-xs text-navy-300">
            Kalitlar Firestore&apos;ning <code>secrets/social</code> hujjatida saqlanadi — u
            mijozlarga umuman ochilmaydi. Bo&apos;sh qoldirilgan maydon o&apos;zgarmaydi.
          </p>
        </div>
      )}
    </div>
  );
}
