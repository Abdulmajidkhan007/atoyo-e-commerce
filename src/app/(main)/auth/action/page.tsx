"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TextField, Button, Alert, CircularProgress } from "@mui/material";
import { verifyPasswordResetCode, confirmPasswordReset, applyActionCode } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useI18n } from "@/lib/i18n/LocaleContext";

/**
 * Firebase auth-amallari sahifasi: parolni tiklash va email tasdiqlash
 * havolalari SHU sahifaga keladi (Firebase'ning standart, xunuk sahifasi
 * o'rniga). Ishlashi uchun Firebase konsolда action URL o'zgartiriladi:
 * Authentication → Templates → istalgan shablonni tahrirlash →
 * "Customize action URL" → https://atoyo-uz.netlify.app/auth/action
 */
function AuthActionContent() {
  const { dict } = useI18n();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") ?? "";
  const oobCode = searchParams.get("oobCode") ?? "";

  const [phase, setPhase] = useState<"loading" | "reset-form" | "done" | "verified" | "invalid">("loading");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function processCode() {
      if (!oobCode) {
        setPhase("invalid");
        return;
      }
      try {
        if (mode === "resetPassword") {
          // Kod haqiqiyligini tekshiramiz - keyin parol formasi ochiladi.
          await verifyPasswordResetCode(getFirebaseAuth(), oobCode);
          if (!cancelled) setPhase("reset-form");
        } else if (mode === "verifyEmail" || mode === "verifyAndChangeEmail" || mode === "recoverEmail") {
          await applyActionCode(getFirebaseAuth(), oobCode);
          if (!cancelled) setPhase("verified");
        } else {
          if (!cancelled) setPhase("invalid");
        }
      } catch {
        if (!cancelled) setPhase("invalid");
      }
    }

    processCode();
    return () => {
      cancelled = true;
    };
  }, [mode, oobCode]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return;
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(getFirebaseAuth(), oobCode, newPassword);
      setPhase("done");
    } catch {
      setPhase("invalid");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="flex flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-6 dark:border-navy-500 dark:bg-navy-700">
        {phase === "loading" && (
          <div className="flex justify-center py-8">
            <CircularProgress />
          </div>
        )}

        {phase === "reset-form" && (
          <>
            <h1 className="text-xl font-bold text-navy-900 dark:text-white">{dict.auth.actionResetTitle}</h1>
            <form onSubmit={handleResetSubmit} className="flex flex-col gap-3">
              <TextField
                label={dict.profile.newPassword}
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText={dict.profile.passwordMin}
                inputProps={{ minLength: 6 }}
                autoFocus
              />
              <Button type="submit" variant="contained" size="large" disabled={isSubmitting || newPassword.length < 6}>
                {isSubmitting ? <CircularProgress size={22} color="inherit" /> : dict.profile.changePassword}
              </Button>
            </form>
          </>
        )}

        {phase === "done" && (
          <>
            <Alert severity="success">{dict.auth.actionResetDone}</Alert>
            <Button component={Link} href="/kirish" variant="contained" size="large">
              {dict.auth.goLogin}
            </Button>
          </>
        )}

        {phase === "verified" && (
          <>
            <Alert severity="success">{dict.auth.actionVerified}</Alert>
            <Button component={Link} href="/kirish" variant="contained" size="large">
              {dict.auth.goLogin}
            </Button>
          </>
        )}

        {phase === "invalid" && (
          <>
            <Alert severity="error">{dict.auth.actionInvalid}</Alert>
            <Button component={Link} href="/kirish" variant="outlined" size="large">
              {dict.auth.goLogin}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={null}>
      <AuthActionContent />
    </Suspense>
  );
}
