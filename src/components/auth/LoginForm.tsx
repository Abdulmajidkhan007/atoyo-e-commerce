"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField, Divider, Alert, CircularProgress } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword } from "@/lib/firebase/auth";
import { useI18n } from "@/lib/i18n/LocaleContext";

export function LoginForm() {
  const router = useRouter();
  const { dict } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError(dict.auth.enterEmailFirst);
      return;
    }
    try {
      await resetPassword(email.trim());
      setInfo(dict.auth.resetSent);
    } catch {
      // Mavjud bo'lmagan email uchun ham xuddi shu xabar - hisob bor-yo'qligini
      // tashqariga oshkor qilmaslik uchun.
      setInfo(dict.auth.resetSent);
    }
  };

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

      <Button
        onClick={handleGoogleSignIn}
        variant="outlined"
        size="large"
        startIcon={<GoogleIcon />}
        disabled={isSubmitting}
        fullWidth
      >
        {dict.auth.google}
      </Button>

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
          onClick={handleForgotPassword}
          className="text-sm text-navy-300 hover:underline"
        >
          {dict.auth.forgot}
        </button>
      )}

      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="text-sm text-aqua-600 hover:underline dark:text-aqua-300"
      >
        {mode === "login" ? dict.auth.noAccount : dict.auth.haveAccount}
      </button>
    </div>
  );
}
