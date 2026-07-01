"use client";

import { useState } from "react";
import { TextField, Button } from "@mui/material";

export function NewsletterForm() {
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
      <p className="text-sm font-medium text-white">Yangiliklarga obuna bo&apos;ling</p>
      <div className="flex gap-2">
        <TextField
          size="small"
          type="email"
          required
          placeholder="Email manzilingiz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="[&_.MuiInputBase-root]:bg-white [&_.MuiInputBase-root]:rounded-md"
        />
        <Button type="submit" variant="contained" color="primary" disabled={status === "loading"}>
          Obuna
        </Button>
      </div>
      {status === "success" && <p className="text-xs text-aqua-300">Obuna bo&apos;ldingiz, rahmat!</p>}
      {status === "error" && <p className="text-xs text-red-300">Xatolik yuz berdi, qayta urining.</p>}
    </form>
  );
}
