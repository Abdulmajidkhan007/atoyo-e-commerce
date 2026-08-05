"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { WHOLESALE_STATUS_LABELS, type WholesaleClient } from "@/types/wholesale";
import { fileToBase64 } from "@/lib/files/base64";

/**
 * OPTOM MIJOZLAR paneli.
 *
 * Mijoz qo'shiladi (yoki 1C ro'yxati Excel bilan yuklanadi) → tizim
 * maxfiy kalit yaratadi → kalit Telegram/SMS/email orqali yuboriladi →
 * mijoz `/optom` da kiritsa optom narxlarni ko'radi.
 */

const EMPTY = { name: "", phone: "", shopName: "", address: "", telegramUsername: "", note: "" };

const STATUS_COLOR: Record<string, "default" | "warning" | "success" | "error"> = {
  invited: "warning",
  active: "success",
  blocked: "error",
};

export function WholesalePanel() {
  const [clients, setClients] = useState<WholesaleClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  /** Kalit yuborish oynasi ochilgan mijoz. */
  const [inviting, setInviting] = useState<WholesaleClient | null>(null);
  const [channels, setChannels] = useState({ telegram: true, sms: true, email: false });
  const [emailAddress, setEmailAddress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/wholesale")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setClients(data.clients ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);

  const call = async (init: RequestInit, okText: string, query = "") => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/wholesale${query}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Xatolik yuz berdi.");
      setMessage({ kind: "ok", text: okText });
      refresh();
      return body;
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const addClient = async () => {
    if (form.name.trim().length < 2 || form.phone.replace(/\D/g, "").length < 9) {
      setMessage({ kind: "error", text: "Ism va telefon raqamni to'g'ri kiriting." });
      return;
    }
    const body = await call(
      { method: "POST", body: JSON.stringify({ ...form, shopName: form.shopName || form.name }) },
      "Mijoz qo'shildi — endi kalitni yuboring."
    );
    if (body) setForm(EMPTY);
  };

  /** Excel/CSV faylini yuklash (1C ro'yxati). */
  const importFile = async (file: File) => {
    setBusy(true);
    setMessage(null);
    try {
      const isXlsx = /\.xlsx?$/i.test(file.name);
      const payload = isXlsx
        ? { xlsx: await fileToBase64(file) }
        : { csv: await file.text() };

      const res = await fetch("/api/admin/wholesale/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Yuklanmadi.");

      setMessage({
        kind: data.errors?.length ? "error" : "ok",
        text:
          `${data.created?.length ?? 0} ta mijoz qo'shildi (jami ${data.total} qator).` +
          (data.errors?.length ? ` Xatolar: ${data.errors.slice(0, 3).join("; ")}` : ""),
      });
      refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Xatolik." });
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async () => {
    if (!inviting) return;
    const body = await call(
      {
        method: "PATCH",
        body: JSON.stringify({
          id: inviting.id,
          action: "invite",
          telegram: channels.telegram,
          sms: channels.sms,
          email: channels.email,
          emailAddress: channels.email ? emailAddress : undefined,
        }),
      },
      "Yuborildi."
    );
    if (body?.result) {
      const sent = [
        body.result.telegram && "Telegram",
        body.result.sms && "SMS",
        body.result.email && "Email",
      ].filter(Boolean);
      setMessage({
        kind: sent.length > 0 ? "ok" : "error",
        text:
          (sent.length > 0 ? `Yuborildi: ${sent.join(", ")}. ` : "Hech qaysi kanal ishlamadi. ") +
          (body.result.errors?.join(" ") ?? ""),
      });
    }
    setInviting(null);
  };

  const filtered = clients.filter((client) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [client.name, client.shopName, client.phone, client.address, String(client.number)]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {message && <Alert severity={message.kind === "ok" ? "success" : "error"}>{message.text}</Alert>}

      {/* ---- Yuqori qator: qidiruv + import ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <TextField
          size="small"
          label="Qidirish (ism, do'kon, telefon)"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: 260 }}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void importFile(file);
          }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<UploadFileIcon />}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          Excel dan yuklash
        </Button>
        <Button component="a" href="/namuna/atoyo-optom-mijozlar.csv" download size="small">
          Namuna fayl
        </Button>
        <span className="text-sm text-navy-300">
          Jami: {clients.length} • Faol: {clients.filter((c) => c.status === "active").length}
        </span>
      </div>

      {/* ---- Ro'yxat ---- */}
      <div className="overflow-x-auto rounded-xl2 border border-navy-100 dark:border-navy-500">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-navy-50 text-left text-xs uppercase text-navy-400 dark:bg-navy-600 dark:text-navy-100">
            <tr>
              <th className="px-3 py-2">№</th>
              <th className="px-3 py-2">Do&apos;kon / mijoz</th>
              <th className="px-3 py-2">Telefon</th>
              <th className="px-3 py-2">Manzil</th>
              <th className="px-3 py-2">Kalit</th>
              <th className="px-3 py-2">Holati</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-navy-300">
                  Ro&apos;yxat bo&apos;sh. Mijoz qo&apos;shing yoki Excel faylini yuklang.
                </td>
              </tr>
            )}

            {filtered.map((client) => (
              <tr key={client.id} className="border-t border-navy-100 dark:border-navy-500">
                <td className="px-3 py-2 font-medium text-navy-900 dark:text-white">{client.number}</td>
                <td className="px-3 py-2">
                  <span className="font-medium text-navy-900 dark:text-white">{client.shopName}</span>
                  <span className="block text-xs text-navy-300">
                    {client.name}
                    {client.telegramUsername ? ` • @${client.telegramUsername}` : ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-navy-500 dark:text-navy-100">+{client.phone}</td>
                <td className="px-3 py-2 text-xs text-navy-400">{client.address}</td>
                <td className="px-3 py-2">
                  <code className="rounded bg-navy-50 px-1.5 py-0.5 text-xs dark:bg-navy-600">
                    {client.accessKey}
                  </code>
                  <IconButton
                    size="small"
                    title="Nusxalash"
                    onClick={() => navigator.clipboard?.writeText(client.accessKey)}
                  >
                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </td>
                <td className="px-3 py-2">
                  <Chip
                    size="small"
                    variant="outlined"
                    color={STATUS_COLOR[client.status] ?? "default"}
                    label={WHOLESALE_STATUS_LABELS[client.status]}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <IconButton
                      size="small"
                      title="Kalitni yuborish"
                      disabled={busy}
                      onClick={() => {
                        setInviting(client);
                        setEmailAddress("");
                      }}
                    >
                      <SendOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Kalitni yangilash"
                      disabled={busy}
                      onClick={() => {
                        if (confirm("Eski kalit ishlamay qoladi. Davom etamizmi?")) {
                          call(
                            { method: "PATCH", body: JSON.stringify({ id: client.id, action: "regenerate" }) },
                            "Yangi kalit yaratildi."
                          );
                        }
                      }}
                    >
                      <AutorenewIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="O'chirish"
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`"${client.shopName}" ro'yxatdan o'chirilsinmi?`)) {
                          call({ method: "DELETE" }, "O'chirildi.", `?id=${client.id}`);
                        }
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Yangi mijoz ---- */}
      <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
        <p className="text-sm font-medium text-navy-700 dark:text-navy-100">Yangi optom mijoz</p>
        <div className="grid gap-3 md:grid-cols-3">
          <TextField size="small" label="Ismi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField size="small" label="Telefon" placeholder="901234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <TextField size="small" label="Do'kon nomi" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
          <TextField size="small" label="Manzil" className="md:col-span-2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <TextField size="small" label="Telegram (ixtiyoriy)" placeholder="@sardor" value={form.telegramUsername} onChange={(e) => setForm({ ...form, telegramUsername: e.target.value })} />
        </div>
        <div>
          <Button variant="contained" disabled={busy} onClick={addClient}>
            Qo&apos;shish va kalit yaratish
          </Button>
        </div>
      </div>

      {/* ---- Kalit yuborish oynasi ---- */}
      <Dialog open={inviting !== null} onClose={() => setInviting(null)} fullWidth maxWidth="xs">
        <DialogTitle>Kalitni yuborish</DialogTitle>
        <DialogContent className="flex flex-col gap-2">
          <p className="text-sm text-navy-300">
            {inviting?.shopName} • +{inviting?.phone}
          </p>
          <FormControlLabel
            control={<Switch checked={channels.telegram} onChange={(e) => setChannels({ ...channels, telegram: e.target.checked })} />}
            label="Telegram (bot bilan yozishgan bo'lsa)"
          />
          <FormControlLabel
            control={<Switch checked={channels.sms} onChange={(e) => setChannels({ ...channels, sms: e.target.checked })} />}
            label="SMS"
          />
          <FormControlLabel
            control={<Switch checked={channels.email} onChange={(e) => setChannels({ ...channels, email: e.target.checked })} />}
            label="Email"
          />
          {channels.email && (
            <TextField
              size="small"
              label="Email manzili"
              value={emailAddress}
              onChange={(event) => setEmailAddress(event.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviting(null)}>Bekor qilish</Button>
          <Button variant="contained" disabled={busy} onClick={sendInvite}>
            Yuborish
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
