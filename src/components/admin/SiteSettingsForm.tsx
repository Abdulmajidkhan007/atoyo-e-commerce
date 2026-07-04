"use client";

import { useState } from "react";
import Image from "next/image";
import { TextField, Button, Snackbar, Alert, CircularProgress } from "@mui/material";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
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
 * ijtimoiy tarmoq havolalari, "Biz haqimizda" matni va do'kon rasmi.
 * Serverdagi /api/admin/site-settings (Admin SDK) orqali yoziladi - client
 * Firebase autentifikatsiya holatiga bog'liq emas, admin panelda ishonchli.
 */
export function SiteSettingsForm({ initialSettings }: { initialSettings: SiteSettings }) {
  const [phone, setPhone] = useState(initialSettings.phone);
  const [email, setEmail] = useState(initialSettings.email);
  const [address, setAddress] = useState(initialSettings.address);
  const [aboutTitle, setAboutTitle] = useState(initialSettings.about.title);
  const [aboutBody, setAboutBody] = useState(initialSettings.about.body);
  const [aboutImageUrl, setAboutImageUrl] = useState(initialSettings.about.imageUrl);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [socials, setSocials] = useState<Record<SocialLink["platform"], string>>(() => {
    const map = { instagram: "", telegram: "", youtube: "", facebook: "" };
    for (const s of initialSettings.socials) map[s.platform] = s.url;
    return map;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<"success" | "error" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setToast(null);
    try {
      // Yangi do'kon rasmi tanlangan bo'lsa avval yuklaymiz.
      let imageUrl = aboutImageUrl;
      if (imageFile) {
        const fd = new FormData();
        fd.append("folder", "site");
        fd.append("files", imageFile);
        const up = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!up.ok) throw new Error("upload");
        imageUrl = (await up.json()).urls?.[0] ?? "";
      }

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
          about: { title: aboutTitle.trim(), body: aboutBody.trim(), imageUrl },
        }),
      });
      if (!res.ok) throw new Error("save");
      setAboutImageUrl(imageUrl);
      setImageFile(null);
      setToast("success");
    } catch {
      setToast("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <h3 className="font-semibold text-navy-900 dark:text-white">Kontakt ma&apos;lumotlari</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth size="small" />
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth size="small" />
        </div>
        <TextField label="Do'kon manzili" value={address} onChange={(e) => setAddress(e.target.value)} fullWidth size="small" />
      </div>

      <div className="flex flex-col gap-3 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <h3 className="font-semibold text-navy-900 dark:text-white">Ijtimoiy tarmoqlar</h3>
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

      <div className="flex flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <h3 className="font-semibold text-navy-900 dark:text-white">Biz haqimizda</h3>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-lg bg-navy-50 dark:bg-navy-900">
            {imageFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={URL.createObjectURL(imageFile)} alt="oldindan" className="h-full w-full object-cover" />
            ) : aboutImageUrl ? (
              <Image src={aboutImageUrl} alt="Do'kon rasmi" fill sizes="144px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-navy-300">🏪</div>
            )}
          </div>
          <div>
            <Button component="label" variant="outlined" size="small" startIcon={<PhotoCameraOutlinedIcon />}>
              Do&apos;kon rasmini tanlash
              <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            </Button>
            <p className="mt-1 text-xs text-navy-300">Bu rasm &quot;Biz haqimizda&quot; sahifasida ko&apos;rinadi.</p>
          </div>
        </div>

        <TextField label="Sarlavha" value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} fullWidth size="small" />
        <TextField label="Matn" value={aboutBody} onChange={(e) => setAboutBody(e.target.value)} multiline minRows={6} fullWidth />
      </div>

      <div>
        <Button type="submit" variant="contained" disabled={isSaving}>
          {isSaving ? <CircularProgress size={20} color="inherit" /> : "Saqlash"}
        </Button>
      </div>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast} variant="filled" onClose={() => setToast(null)} sx={{ width: "100%" }}>
            {toast === "success" ? "Sayt ma'lumotlari saqlandi." : "Saqlashda xatolik yuz berdi."}
          </Alert>
        ) : undefined}
      </Snackbar>
    </form>
  );
}
