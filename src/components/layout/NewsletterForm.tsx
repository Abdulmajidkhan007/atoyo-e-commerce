"use client";

import { useState } from "react";
import { TextField, Button } from "@mui/material";
import { useTranslation } from "@/i18n/I18nProvider";

export function NewsletterForm() {
  const t = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("failed");
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-sm font-medium text-white">{t.newsletter.heading}</p>
      <div className="flex gap-2">
        <TextField
          size="small"
          type="email"
          required
          placeholder={t.newsletter.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="[&_.MuiInputBase-root]:bg-white [&_.MuiInputBase-root]:rounded-md"
        />
        <Button type="submit" variant="contained" color="primary" disabled={status === "loading"}>
          {t.newsletter.submit}
        </Button>
      </div>
      {status === "success" && <p className="text-xs text-aqua-300">{t.newsletter.success}</p>}
      {status === "error" && <p className="text-xs text-red-300">{t.newsletter.error}</p>}
    </form>
  );
}
