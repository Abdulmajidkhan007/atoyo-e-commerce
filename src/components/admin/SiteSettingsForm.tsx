"use client";

import { useState } from "react";
import { TextField, Button, Alert, CircularProgress } from "@mui/material";
import type { SiteSettings, SocialLink } from "@/types/content";

const SOCIAL_PLATFORMS: SocialLink["platform"][] = ["instagram", "telegram", "youtube", "facebook"];

const PLATFORM_LABELS: Record<SocialLink["platform"], string> = {
  instagram: "Instagram",
  telegram: "Telegram",
  youtube: "YouTube",
  facebook: "Facebook",
};

/**
 * Admin sayt sozlamalarini tahrirlaydi: kontakt (telefon/email/manzil),
 * ijtimoiy tarmoq havolalari va "Biz haqimizda" matni. Serverdagi
 * /api/admin/site-settings (Admin SDK) orqali yoziladi - client Firebase
 * autentifikatsiya holatiga bog'liq emas, admin panelda ishonchli ishlaydi.
 */
export function SiteSettingsForm({ initialSettings }: { initialSettings: SiteSettings }) {
  const [phone, setPhone] = useState(initialSettings.phone);
  const [email, setEmail] = useState(initialSettings.email);
  const [address, setAddress] = useState(initialSettings.address);
  const [aboutTitle, setAboutTitle] = useState(initialSettings.about.title);
  const [aboutBody, setAboutBody] = useState(initialSettings.about.body);
  const [socials, setSocials] = useState<Record<SocialLink["platform"], string>>(() => {
    const map = { instagram: "", telegram: "", youtube: "", facebook: "" };
    for (const s of initialSettings.socials) map[s.platform] = s.url;
    return map;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setResult(null);
    try {
      const socialsArray: SocialLink[] = SOCIAL_PLATFORMS.map((platform) => ({
        platform,
        url: socials[platform].trim(),
      })).filter((s) => s.url);

      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          socials: socialsArray,
          about: { title: aboutTitle.trim(), body: aboutBody.trim() },
        }),
      });
      setResult(res.ok ? "success" : "error");
    } catch {
      setResult("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth size="small" />
        <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth size="small" />
      </div>
      <TextField label="Do'kon manzili" value={address} onChange={(e) => setAddress(e.target.value)} fullWidth size="small" />

      <div>
        <p className="mb-2 text-sm font-medium text-navy-900 dark:text-white">Ijtimoiy tarmoqlar</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_PLATFORMS.map((platform) => (
            <TextField
              key={platform}
              label={PLATFORM_LABELS[platform]}
              placeholder="https://..."
              value={socials[platform]}
              onChange={(e) => setSocials((prev) => ({ ...prev, [platform]: e.target.value }))}
              fullWidth
              size="small"
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-navy-900 dark:text-white">Biz haqimizda</p>
        <div className="flex flex-col gap-3">
          <TextField label="Sarlavha" value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} fullWidth size="small" />
          <TextField
            label="Matn"
            value={aboutBody}
            onChange={(e) => setAboutBody(e.target.value)}
            multiline
            minRows={5}
            fullWidth
          />
        </div>
      </div>

      {result === "success" && <Alert severity="success">Sozlamalar saqlandi.</Alert>}
      {result === "error" && <Alert severity="error">Saqlashda xatolik yuz berdi.</Alert>}

      <div>
        <Button type="submit" variant="contained" disabled={isSaving}>
          {isSaving ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
        </Button>
      </div>
    </form>
  );
}
