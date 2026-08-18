"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  FormControlLabel,
  IconButton,
  MenuItem,
  Switch,
  TextField,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { DeliverySettings, PromoCode } from "@/types/promo";
import { formatSom } from "@/lib/format";
import { freeDeliveryText, installServiceText } from "@/lib/delivery/text";

function toDateInput(ms: number | null): string {
  return ms ? new Date(ms).toISOString().slice(0, 10) : "";
}

/** Promokodlar CRUD + yetkazib berish narxi. Barcha yozuvlar server API orqali. */
export function PromoManager({
  initialPromos,
  initialDelivery,
}: {
  initialPromos: PromoCode[];
  initialDelivery: DeliverySettings;
}) {
  const [promos, setPromos] = useState(initialPromos);
  const [delivery, setDelivery] = useState(initialDelivery);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: "",
    type: "percent" as PromoCode["type"],
    value: "10",
    minOrderAmount: "0",
    maxUses: "",
    expiresAt: "",
  });

  async function createPromo(event: React.FormEvent) {
    event?.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          type: form.type,
          value: Number(form.value),
          minOrderAmount: Number(form.minOrderAmount || 0),
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).getTime() : null,
          isActive: true,
        }),
      });
      const data = (await res.json()) as { promo?: PromoCode; error?: string };
      if (!res.ok || !data.promo) throw new Error(data.error ?? "Saqlanmadi");

      setPromos((prev) => [data.promo!, ...prev]);
      setForm({ code: "", type: "percent", value: "10", minOrderAmount: "0", maxUses: "", expiresAt: "" });
      setMessage({ type: "success", text: "Promokod yaratildi." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Xatolik" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(promo: PromoCode) {
    const next = !promo.isActive;
    setPromos((prev) => prev.map((p) => (p.code === promo.code ? { ...p, isActive: next } : p)));
    const res = await fetch(`/api/admin/promo/${promo.code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    if (!res.ok) {
      setPromos((prev) => prev.map((p) => (p.code === promo.code ? { ...p, isActive: !next } : p)));
      setMessage({ type: "error", text: "Holatni o'zgartirib bo'lmadi." });
    }
  }

  async function deletePromo(code: string) {
    if (!confirm(`"${code}" promokodi o'chirilsinmi?`)) return;
    const res = await fetch(`/api/admin/promo/${code}`, { method: "DELETE" });
    if (res.ok) setPromos((prev) => prev.filter((p) => p.code !== code));
    else setMessage({ type: "error", text: "O'chirib bo'lmadi." });
  }

  async function saveDelivery(event?: React.FormEvent) {
    event?.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/delivery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(delivery),
      });
      if (!res.ok) throw new Error("Saqlanmadi");
      setMessage({ type: "success", text: "Yetkazib berish sozlamalari saqlandi." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Xatolik" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {message && <Alert severity={message.type}>{message.text}</Alert>}

      {/* ---- Yetkazib berish narxi ---- */}
      <section className="rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-800">
        <h2 className="mb-3 font-semibold text-navy-900 dark:text-white">Yetkazib berish narxi</h2>
        <form onSubmit={saveDelivery} className="flex flex-wrap items-center gap-4">
          <FormControlLabel
            control={
              <Switch
                checked={delivery.enabled}
                onChange={(e) => setDelivery({ ...delivery, enabled: e.target.checked })}
              />
            }
            label="Yoqilgan"
          />
          <TextField
            label="Narx (so'm)"
            type="number"
            size="small"
            value={delivery.fee}
            onChange={(e) => setDelivery({ ...delivery, fee: Number(e.target.value) || 0 })}
          />
          <TextField
            label="Shu summadan bepul"
            type="number"
            size="small"
            helperText="0 - bepul emas"
            value={delivery.freeFrom}
            onChange={(e) => setDelivery({ ...delivery, freeFrom: Number(e.target.value) || 0 })}
          />
          <Button type="submit" variant="contained" disabled={saving}>
            Saqlash
          </Button>
        </form>

        {/* ---- MIJOZGA KO'RINADIGAN VA'DA (matn) ----
             Narx hisobiga ta'sir qilmaydi: bu matn bosh sahifada,
             mahsulot sahifasida, savatda, botda va kanal postida
             chiqadi (`lib/delivery/text.ts`). */}
        <div className="mt-5 flex flex-col gap-3 border-t border-navy-100 pt-4 dark:border-navy-500">
          <h3 className="font-medium text-navy-900 dark:text-white">
            Mijozga ko&apos;rinadigan va&apos;da
          </h3>
          <p className="text-xs text-navy-300">
            Bu matn saytda (bosh sahifa, mahsulot, savat, kontakt), ilovada,
            botda va kanal postida chiqadi. Narx hisobiga ta&apos;sir qilmaydi.
          </p>

          <div className="flex flex-wrap items-start gap-3">
            <TextField
              size="small"
              label="Shahar"
              value={delivery.city ?? ""}
              onChange={(e) => setDelivery({ ...delivery, city: e.target.value })}
              className="!w-40"
            />
            <TextField
              size="small"
              type="number"
              label="Bepul radius (km)"
              value={delivery.freeRadiusKm ?? 0}
              onChange={(e) =>
                setDelivery({ ...delivery, freeRadiusKm: Number(e.target.value) || 0 })
              }
              className="!w-44"
            />
            <TextField
              size="small"
              label="O'z matni (ixtiyoriy)"
              value={delivery.note ?? ""}
              onChange={(e) => setDelivery({ ...delivery, note: e.target.value })}
              helperText={`Bo'sh bo'lsa: "${freeDeliveryText({ ...delivery, note: "" })}"`}
              className="!min-w-72 !flex-1"
            />
          </div>

          <div className="flex flex-wrap items-start gap-3">
            <FormControlLabel
              control={
                <Switch
                  checked={delivery.installEnabled ?? false}
                  onChange={(e) => setDelivery({ ...delivery, installEnabled: e.target.checked })}
                />
              }
              label="O'rnatib berish xizmati bor"
            />
            <TextField
              size="small"
              label="O'rnatish izohi (ixtiyoriy)"
              value={delivery.installNote ?? ""}
              onChange={(e) => setDelivery({ ...delivery, installNote: e.target.value })}
              disabled={!delivery.installEnabled}
              helperText="Bo'sh bo'lsa avtomatik matn yoziladi"
              className="!min-w-72 !flex-1"
            />
            <Button variant="contained" size="small" onClick={saveDelivery} disabled={saving}>
              Saqlash
            </Button>
          </div>

          <p className="rounded-lg bg-navy-50 p-3 text-xs text-navy-500 dark:bg-navy-900 dark:text-navy-100">
            Mijoz ko&apos;radi: <b>{freeDeliveryText(delivery)}</b>
            {installServiceText(delivery) ? ` ${installServiceText(delivery)}` : ""}
          </p>
        </div>

        {/* ---- Hududlar: tuman bo'yicha alohida narx ---- */}
        <div className="mt-5 flex flex-col gap-2 border-t border-navy-100 pt-4 dark:border-navy-500">
          <h3 className="font-medium text-navy-900 dark:text-white">Hududlar (ixtiyoriy)</h3>
          <p className="text-xs text-navy-300">
            Tuman yoki masofa bo&apos;yicha alohida narx. Ro&apos;yxat bo&apos;sh bo&apos;lsa hamma
            joyga yuqoridagi standart narx qo&apos;llanadi. Mijoz buyurtma berayotganda
            hududni tanlaydi.
          </p>

          {(delivery.zones ?? []).map((zone, index) => (
            <div key={zone.id} className="flex flex-wrap items-center gap-2">
              <TextField
                size="small"
                label="Hudud nomi"
                value={zone.name}
                onChange={(e) => {
                  const zones = [...(delivery.zones ?? [])];
                  zones[index] = { ...zone, name: e.target.value };
                  setDelivery({ ...delivery, zones });
                }}
              />
              <TextField
                size="small"
                type="number"
                label="Narx"
                value={zone.fee}
                onChange={(e) => {
                  const zones = [...(delivery.zones ?? [])];
                  zones[index] = { ...zone, fee: Number(e.target.value) || 0 };
                  setDelivery({ ...delivery, zones });
                }}
                className="!w-32"
              />
              <TextField
                size="small"
                type="number"
                label="Shu summadan bepul"
                value={zone.freeFrom ?? 0}
                onChange={(e) => {
                  const zones = [...(delivery.zones ?? [])];
                  zones[index] = { ...zone, freeFrom: Number(e.target.value) || 0 };
                  setDelivery({ ...delivery, zones });
                }}
                className="!w-44"
              />
              <Button
                size="small"
                color="error"
                onClick={() =>
                  setDelivery({
                    ...delivery,
                    zones: (delivery.zones ?? []).filter((_, i) => i !== index),
                  })
                }
              >
                O&apos;chirish
              </Button>
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              size="small"
              variant="outlined"
              onClick={() =>
                setDelivery({
                  ...delivery,
                  zones: [
                    ...(delivery.zones ?? []),
                    { id: `zona-${Date.now().toString(36)}`, name: "", fee: 0, freeFrom: 0 },
                  ],
                })
              }
            >
              Hudud qo&apos;shish
            </Button>
            <Button size="small" variant="contained" onClick={saveDelivery} disabled={saving}>
              Hududlarni saqlash
            </Button>
          </div>
        </div>
      </section>

      {/* ---- Yangi promokod ---- */}
      <section className="rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-800">
        <h2 className="mb-3 font-semibold text-navy-900 dark:text-white">Yangi promokod</h2>
        <form onSubmit={createPromo} className="flex flex-wrap items-start gap-3">
          <TextField
            label="Kod"
            size="small"
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="ATOYO10"
          />
          <TextField
            select
            label="Turi"
            size="small"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as PromoCode["type"] })}
            className="!min-w-32"
          >
            <MenuItem value="percent">Foiz (%)</MenuItem>
            <MenuItem value="fixed">So&apos;mda</MenuItem>
          </TextField>
          <TextField
            label={form.type === "percent" ? "Foiz" : "Summa"}
            type="number"
            size="small"
            required
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
          <TextField
            label="Minimal buyurtma"
            type="number"
            size="small"
            value={form.minOrderAmount}
            onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
          />
          <TextField
            label="Limit (marta)"
            type="number"
            size="small"
            helperText="Bo'sh - cheksiz"
            value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
          />
          <TextField
            label="Amal qilish muddati"
            type="date"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
          <Button type="submit" variant="contained" disabled={saving}>
            Qo&apos;shish
          </Button>
        </form>
      </section>

      {/* ---- Ro'yxat ---- */}
      <section className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white dark:border-navy-500 dark:bg-navy-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-navy-50 text-left text-navy-500 dark:bg-navy-900 dark:text-navy-100">
            <tr>
              <th className="p-3">Kod</th>
              <th className="p-3">Chegirma</th>
              <th className="p-3">Minimal</th>
              <th className="p-3">Ishlatilgan</th>
              <th className="p-3">Muddat</th>
              <th className="p-3">Faol</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {promos.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-navy-300">
                  Promokodlar yo&apos;q
                </td>
              </tr>
            ) : (
              promos.map((promo) => (
                <tr key={promo.code} className="border-t border-navy-100 dark:border-navy-500">
                  <td className="p-3 font-mono font-medium text-navy-900 dark:text-white">{promo.code}</td>
                  <td className="p-3">
                    {promo.type === "percent" ? `${promo.value}%` : formatSom(promo.value)}
                  </td>
                  <td className="p-3">{promo.minOrderAmount > 0 ? formatSom(promo.minOrderAmount) : "—"}</td>
                  <td className="p-3">
                    {promo.usedCount}
                    {promo.maxUses !== null ? ` / ${promo.maxUses}` : ""}
                  </td>
                  <td className="p-3">{toDateInput(promo.expiresAt) || "—"}</td>
                  <td className="p-3">
                    <Switch size="small" checked={promo.isActive} onChange={() => toggleActive(promo)} />
                  </td>
                  <td className="p-3 text-right">
                    <IconButton size="small" aria-label="O'chirish" onClick={() => deletePromo(promo.code)}>
                      <DeleteOutlineIcon fontSize="small" className="text-red-400" />
                    </IconButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
