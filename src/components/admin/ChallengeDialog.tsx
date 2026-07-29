"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

/**
 * JUMBOQ DIALOGI - muhim sozlamalarni (topic ID lari, kanal, bot tokeni)
 * saqlashdan oldin chiqadi. Savolni server beradi, javob ham serverda
 * tekshiriladi: bu oyna shunchaki "chiroyli tasdiqlash" emas, jumboqsiz
 * so'rov API tomonidan rad etiladi.
 */

export interface ChallengeAnswer {
  challengeId: string;
  challengeAnswer: number;
}

export function useChallenge() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolver, setResolver] = useState<((value: ChallengeAnswer | null) => void) | null>(null);

  /** Jumboqni so'raydi va javob kiritilguncha kutadi (bekor qilinsa null). */
  const ask = async (): Promise<ChallengeAnswer | null> => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/security-challenge", { method: "POST" });
      const data = (await res.json()) as { id?: string; question?: string; error?: string };
      if (!res.ok || !data.id || !data.question) throw new Error(data.error ?? "Jumboq olinmadi.");
      setChallengeId(data.id);
      setQuestion(data.question);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Jumboq olinmadi.");
      setLoading(false);
      return null;
    }
    setLoading(false);

    return new Promise<ChallengeAnswer | null>((resolve) => {
      setResolver(() => resolve);
    });
  };

  const dialog = (
    <ChallengeDialog
      open={open}
      question={question}
      error={error}
      onCancel={() => {
        setOpen(false);
        resolver?.(null);
        setResolver(null);
      }}
      onConfirm={(answer) => {
        setOpen(false);
        resolver?.({ challengeId, challengeAnswer: answer });
        setResolver(null);
      }}
    />
  );

  return { ask, dialog, loading, error };
}

function ChallengeDialog({
  open,
  question,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  question: string;
  error: string | null;
  onCancel: () => void;
  onConfirm: (answer: number) => void;
}) {
  const [value, setValue] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const answer = Number(value.trim());
    if (!Number.isFinite(answer)) return;
    setValue("");
    onConfirm(answer);
  };

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>Tasdiqlash uchun jumboq</DialogTitle>
        <DialogContent className="flex flex-col gap-3">
          <p className="text-sm text-navy-300">
            Bu sozlamalar bot ishlashiga bevosita ta&apos;sir qiladi. Davom etish uchun quyidagi
            savolga javob bering:
          </p>
          <p className="text-center text-2xl font-bold text-navy-900 dark:text-white">{question}</p>
          <TextField
            autoFocus
            label="Javob"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel}>Bekor qilish</Button>
          <Button type="submit" variant="contained" disabled={!value.trim()}>
            Tasdiqlash
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** Tugmadagi kutish belgisi - forma komponentlarida qayta ishlatiladi. */
export function SavingIcon() {
  return <CircularProgress size={20} color="inherit" />;
}
