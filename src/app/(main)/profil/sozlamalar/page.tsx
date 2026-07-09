"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TextField, Button, Alert, CircularProgress, Avatar } from "@mui/material";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useAppSelector } from "@/redux/hooks";
import { useI18n } from "@/lib/i18n/LocaleContext";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const { profile, status } = useAppSelector((s) => s.user);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  // Parol o'zgartirish bo'limi
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordResult, setPasswordResult] = useState<"success" | "wrong" | "error" | null>(null);

  useEffect(() => {
    function hydrateFromProfile() {
      if (!profile) return;
      setDisplayName(profile.displayName ?? "");
      setPhoneNumber(profile.phoneNumber ?? "");
      setHomeAddress(profile.homeAddress ?? "");
      setPhotoURL(profile.photoURL ?? null);
    }
    hydrateFromProfile();
  }, [profile]);

  if (status === "unauthenticated") {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-4 text-navy-300">{dict.profile.loginPrompt}</p>
        <Button component={Link} href="/kirish" variant="contained">{dict.nav.login}</Button>
      </section>
    );
  }

  const handlePhotoChange = async (file: File | null) => {
    if (!file) return;
    setIsUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/photo", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload");
      const { url } = await res.json();
      setPhotoURL(url);
      setResult("success");
    } catch {
      setResult("error");
    } finally {
      setIsUploading(false);
    }
  };

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordResult(null);
    if (newPassword.length < 6) return;
    setIsChangingPassword(true);
    try {
      const authUser = getFirebaseAuth().currentUser;
      if (!authUser?.email) throw new Error("no-auth");
      // Firebase parol almashtirishdan oldin qayta autentifikatsiyani talab qiladi.
      const credential = EmailAuthProvider.credential(authUser.email, currentPassword);
      await reauthenticateWithCredential(authUser, credential);
      await updatePassword(authUser, newPassword);
      setPasswordResult("success");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      setPasswordResult(
        code === "auth/wrong-password" || code === "auth/invalid-credential" ? "wrong" : "error"
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-navy-900 dark:text-white">{dict.profile.settingsTitle}</h1>

      {/* Profil rasmi */}
      <div className="mb-6 flex items-center gap-4">
        <Avatar src={photoURL ?? undefined} sx={{ width: 72, height: 72 }}>
          {displayName?.[0] ?? profile?.email?.[0] ?? "U"}
        </Avatar>
        <div>
          <Button component="label" variant="outlined" size="small" startIcon={<PhotoCameraOutlinedIcon />} disabled={isUploading}>
            {isUploading ? <CircularProgress size={18} color="inherit" /> : dict.profile.changePhoto}
            <input
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
            />
          </Button>
          <p className="mt-1 text-xs text-navy-300">{dict.profile.photoNote}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField label={dict.checkout.fullName} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        <TextField label="Email" value={profile?.email ?? ""} disabled helperText={dict.profile.emailLocked} />
        <TextField label={dict.checkout.phone} placeholder="+998901234567" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
        <TextField
          label={dict.profile.homeAddress}
          placeholder={dict.profile.addressPlaceholder}
          value={homeAddress}
          onChange={(e) => setHomeAddress(e.target.value)}
          multiline
          minRows={2}
        />

        {result === "success" && <Alert severity="success">{dict.profile.saved}</Alert>}
        {result === "error" && <Alert severity="error">{dict.common.errorRetry}</Alert>}

        <div className="flex gap-2">
          <Button type="submit" variant="contained" disabled={isSaving}>
            {isSaving ? <CircularProgress size={20} color="inherit" /> : dict.common.save}
          </Button>
          <Button component={Link} href="/profil" variant="text">{dict.common.cancel}</Button>
        </div>
      </form>

      {/* Parolni o'zgartirish */}
      <form onSubmit={handlePasswordChange} className="mt-10 flex flex-col gap-4 border-t border-navy-100 pt-6 dark:border-navy-500">
        <h2 className="text-lg font-semibold text-navy-900 dark:text-white">{dict.profile.passwordTitle}</h2>
        <TextField
          label={dict.profile.currentPassword}
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <TextField
          label={dict.profile.newPassword}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          helperText={dict.profile.passwordMin}
          required
        />

        {passwordResult === "success" && <Alert severity="success">{dict.profile.passwordChanged}</Alert>}
        {passwordResult === "wrong" && <Alert severity="error">{dict.profile.wrongPassword}</Alert>}
        {passwordResult === "error" && <Alert severity="error">{dict.common.errorRetry}</Alert>}

        <div>
          <Button type="submit" variant="outlined" disabled={isChangingPassword || newPassword.length < 6 || !currentPassword}>
            {isChangingPassword ? <CircularProgress size={20} color="inherit" /> : dict.profile.changePassword}
          </Button>
        </div>
      </form>
    </section>
  );
}
