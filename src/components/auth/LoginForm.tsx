"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField, Divider, Alert, CircularProgress } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { signInWithGoogle, signInWithEmail, registerWithEmail } from "@/lib/firebase/auth";
import { useTranslation } from "@/i18n/I18nProvider";

export function LoginForm() {
  const router = useRouter();
  const t = useTranslation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      router.push("/");
    } catch {
      setError(t.login.error);
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
      setError(t.login.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl2 border border-navy-100 bg-white p-6 dark:border-navy-500 dark:bg-navy-700">
      <h1 className="text-xl font-bold text-navy-900 dark:text-white">
        {mode === "login" ? t.login.signIn : t.login.register}
      </h1>

      <Button
        onClick={handleGoogleSignIn}
        variant="outlined"
        size="large"
        startIcon={<GoogleIcon />}
        disabled={isSubmitting}
        fullWidth
      >
        {t.login.google}
      </Button>

      <Divider>{t.login.or}</Divider>

      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
        <TextField label={t.login.email} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label={t.login.password}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          inputProps={{ minLength: 6 }}
        />

        {error && <Alert severity="error">{error}</Alert>}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : mode === "login" ? (
            t.login.submitLogin
          ) : (
            t.login.register
          )}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="text-sm text-aqua-600 hover:underline dark:text-aqua-300"
      >
        {mode === "login" ? t.login.toRegister : t.login.toLogin}
      </button>
    </div>
  );
}
