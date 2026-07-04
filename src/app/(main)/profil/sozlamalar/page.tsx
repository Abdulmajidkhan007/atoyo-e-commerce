"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TextField, Button, Alert, CircularProgress } from "@mui/material";
import { useAppSelector } from "@/redux/hooks";
import { useTranslation } from "@/i18n/I18nProvider";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const t = useTranslation();
  const { profile, status } = useAppSelector((s) => s.user);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    function hydrateFromProfile() {
      if (!profile) return;
      setDisplayName(profile.displayName ?? "");
      setPhoneNumber(profile.phoneNumber ?? "");
      setHomeAddress(profile.homeAddress ?? "");
    }
    hydrateFromProfile();
  }, [profile]);

  if (status === "unauthenticated") {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-4 text-navy-300">{t.profileSettings.signInPrompt}</p>
        <Button component={Link} href="/kirish" variant="contained">{t.nav.login}</Button>
      </section>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim() || null,
          homeAddress: homeAddress.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setResult("success");
      setTimeout(() => router.push("/profil"), 800);
    } catch {
      setResult("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-navy-900 dark:text-white">{t.profileSettings.title}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField label={t.profileSettings.fullName} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        <TextField label={t.profileSettings.email} value={profile?.email ?? ""} disabled helperText={t.profileSettings.emailHelper} />
        <TextField label={t.profileSettings.phone} placeholder="+998901234567" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
        <TextField
          label={t.profileSettings.homeAddress}
          placeholder={t.profileSettings.homeAddressPlaceholder}
          value={homeAddress}
          onChange={(e) => setHomeAddress(e.target.value)}
          multiline
          minRows={2}
        />

        {result === "success" && <Alert severity="success">{t.profileSettings.saved}</Alert>}
        {result === "error" && <Alert severity="error">{t.profileSettings.saveError}</Alert>}

        <div className="flex gap-2">
          <Button type="submit" variant="contained" disabled={isSaving}>
            {isSaving ? <CircularProgress size={20} color="inherit" /> : t.common.save}
          </Button>
          <Button component={Link} href="/profil" variant="text">{t.common.cancel}</Button>
        </div>
      </form>
    </section>
  );
}
