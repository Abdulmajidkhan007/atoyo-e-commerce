"use client";

import { useState } from "react";
import { TextField, Button, Alert, CircularProgress } from "@mui/material";
import { normalizePhone, isValidName } from "@/lib/validation";
import { useI18n } from "@/lib/i18n/LocaleContext";

export default function ContactPage() {
  const { dict } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setValidationMsg(null);

    if (!isValidName(name)) {
      setValidationMsg(dict.checkout.invalidName);
      return;
    }
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setValidationMsg(dict.checkout.invalidPhone);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: normalizedPhone, question }),
      });
      if (!response.ok) throw new Error("failed");

      setResult("success");
      setName("");
      setPhone("");
      setQuestion("");
    } catch {
      setResult("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">{dict.contact.title}</h1>
      <p className="mb-6 text-sm text-navy-300">{dict.contact.subtitle}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField label={dict.checkout.fullName} required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label={dict.checkout.phone}
          required
          placeholder="+998901234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <TextField
          label={dict.contact.question}
          required
          multiline
          minRows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        {validationMsg && <Alert severity="warning">{validationMsg}</Alert>}
        {result === "success" && <Alert severity="success">{dict.contact.success}</Alert>}
        {result === "error" && <Alert severity="error">{dict.common.errorRetry}</Alert>}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : dict.contact.send}
        </Button>
      </form>
    </section>
  );
}
