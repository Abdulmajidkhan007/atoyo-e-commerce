"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField, Divider, Alert, CircularProgress } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword } from "@/lib/firebase/auth";
import { TelegramLoginButton } from "./TelegramLoginButton";
import { useTelegramLogin } from "./useTelegramLogin";
import { useI18n } from "@/lib/i18n/LocaleContext";

export function LoginForm() {
  const router = useRouter();
  const { dict } = useI18n();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { tgBusy, tgError, tgWaiting, startTelegramLogin } = useTelegramLogin();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchMode = (next: "login" | "register" | "reset") => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError(dict.auth.enterEmailFirst);
      return;
    }
    setIsSubmitting(true);
    try {
      // Avval o'z serverimiz orqali (o'z domenimizdagi havola + o'z
      // pochtamiz). SMTP sozlanmagan bo'lsa - Firebase'ning o'z xatiga
      // qaytamiz, shunda oqim baribir ishlaydi.
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { fallback?: boolean };
      if (!res.ok || data.fallback) await resetPassword(email.trim());
      setInfo(dict.auth.resetSent);
    } catch {
      // Mavjud bo'lmagan email uchun ham xuddi shu xabar - hisob bor-yo'qligini
      // tashqariga oshkor qilmaslik uchun.
      setInfo(dict.auth.resetSent);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Alohida "Parolni tiklash" bo'limi ----
  if (mode === "reset") {
    return (
      <div className="flex flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-6 dark:border-navy-500 dark:bg-navy-700">
        <h1 className="text-xl font-bold text-navy-900 dark:text-white">{dict.auth.resetTitle}</h1>

        <form onSubmit={handleResetSubmit} className="flex flex-col gap-3">
          <TextField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />

          {error && <Alert severity="error">{error}</Alert>}
          {info && <Alert severity="success">{info}</Alert>}

          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={22} color="inherit" /> : dict.auth.sendReset}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => switchMode("login")}
          className="text-sm text-aqua-600 hover:underline dark:text-aqua-300"
        >
          {dict.auth.backToLogin}
        </button>
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      router.push("/");
    } catch {
      setError(dict.auth.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      router.push("/");
    } catch {
      setError(dict.auth.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-6 dark:border-navy-500 dark:bg-navy-700">
      <h1 className="text-xl font-bold text-navy-900 dark:text-white">
        {mode === "login" ? dict.auth.loginTitle : dict.auth.registerTitle}
      </h1>

      {/* Ijtimoiy kirish: Google va Telegram yonma-yon, bir xil o'lchamda
          (to'liq kenglikda emas). Telegram oqimi bot orqali - domen
          sozlashga bog'liq emas. */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={handleGoogleSignIn}
          variant="outlined"
          size="medium"
          startIcon={<GoogleIcon />}
          disabled={isSubmitting || tgBusy}
          className="!normal-case"
        >
          Google
        </Button>

        <TelegramLoginButton
          onClick={startTelegramLogin}
          disabled={isSubmitting || tgBusy}
          label={dict.auth.telegram}
        />
      </div>

      {tgError && <Alert severity="error">{dict.auth.telegramError}</Alert>}
      {tgWaiting && <Alert severity="info">{dict.auth.telegramWaiting}</Alert>}
      {tgBusy && (
        <div className="flex justify-center">
          <CircularProgress size={22} />
        </div>
      )}

      <Divider>{dict.auth.or}</Divider>

      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
        <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label={dict.auth.password}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          inputProps={{ minLength: 6 }}
        />

        {error && <Alert severity="error">{error}</Alert>}
        {info && <Alert severity="success">{info}</Alert>}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : mode === "login" ? (
            dict.nav.login
          ) : (
            dict.auth.register
          )}
        </Button>
      </form>

      {mode === "login" && (
        <button
          type="button"
          onClick={() => switchMode("reset")}
          className="text-sm text-navy-300 hover:underline"
        >
          {dict.auth.forgot}
        </button>
      )}

      <button
        type="button"
        onClick={() => switchMode(mode === "login" ? "register" : "login")}
        className="text-sm text-aqua-600 hover:underline dark:text-aqua-300"
      >
        {mode === "login" ? dict.auth.noAccount : dict.auth.haveAccount}
      </button>
    </div>
  );
}
