"use client";

import { useState } from "react";
import { TextField, Button, Alert, CircularProgress } from "@mui/material";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, question }),
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
      <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Bog&apos;lanish</h1>
      <p className="mb-6 text-sm text-navy-300">
        Savolingiz bormi yoki qayta qo&apos;ng&apos;iroq qilishimizni istaysizmi? Formani to&apos;ldiring.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField label="Ism-familiya" required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label="Telefon raqami"
          required
          placeholder="+998901234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <TextField
          label="Savolingiz"
          required
          multiline
          minRows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        {result === "success" && <Alert severity="success">Xabaringiz yuborildi. Tez orada bog&apos;lanamiz!</Alert>}
        {result === "error" && <Alert severity="error">Xatolik yuz berdi. Qayta urinib ko&apos;ring.</Alert>}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : "Yuborish"}
        </Button>
      </form>
    </section>
  );
}
