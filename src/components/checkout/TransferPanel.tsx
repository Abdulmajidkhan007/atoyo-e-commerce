"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, CircularProgress, IconButton, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { formatSom } from "@/lib/format";
import { formatCardNumber } from "@/types/payment-transfer";
import type { Order } from "@/types/order";

/**
 * KARTAGA O'TKAZMA PANELI (buyurtma sahifasida).
 *
 * Mijoz: karta raqami va summani nusxalaydi → bank ilovasida
 * o'tkazadi → chek skrinshotini shu yerga yuklaydi. Holat (chek
 * yuklangan / tasdiqlangan / topilmadi) serverdan keladi —
 * yuklangach sahifa `router.refresh()` bilan yangilanadi.
 *
 * Telefonda mijoz bank ilovasiga o'tib qaytadi — shuning uchun hamma
 * narsa havolali sahifada, oynada (modal) emas: brauzer sahifani
 * qayta yuklasa ham ma'lumot yo'qolmaydi.
 */
export function TransferPanel({
  orderId,
  token,
  amount,
  card,
  paymentStatus,
  hasReceipt,
  cancelled,
}: {
  orderId: string;
  token: string;
  amount: number;
  card: { number: string; holder: string; bank: string; note: string };
  paymentStatus: Order["paymentStatus"];
  hasReceipt: boolean;
  cancelled: boolean;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.payment;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard ruxsati yo'q - mijoz qo'lda ko'chiradi (matn ko'rinib turibdi).
    }
  };

  const upload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("t", token);
      const res = await fetch(`/api/orders/${orderId}/receipt`, { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t.uploadError);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.uploadError);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (paymentStatus === "paid") {
    return (
      <Alert severity="success" className="mt-4">
        {t.paid}
      </Alert>
    );
  }
  if (cancelled) return null;

  const rawAmount = String(Math.round(amount));

  return (
    <div className="mt-4 rounded-xl2 border border-aqua-500/30 bg-aqua-50/60 p-5 dark:border-aqua-500/30 dark:bg-navy-800">
      <h2 className="text-base font-bold text-navy-900 dark:text-white">{t.transferTitle}</h2>

      <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-sm text-navy-600 dark:text-navy-100">
        <li>{t.step1}</li>
        <li>{t.step2}</li>
        <li>{t.step3}</li>
      </ol>

      <dl className="mt-4 flex flex-col gap-3">
        <div className="rounded-xl bg-white p-3 dark:bg-navy-700">
          <dt className="text-xs text-navy-300">
            {t.cardNumber}
            {card.bank ? ` · ${card.bank}` : ""}
          </dt>
          <dd className="flex items-center justify-between gap-2">
            <span className="font-mono text-lg font-bold tracking-wider text-navy-900 dark:text-white">
              {formatCardNumber(card.number)}
            </span>
            <Tooltip title={copied === "card" ? t.copied : t.copy}>
              <IconButton aria-label={`${t.cardNumber} — ${t.copy}`} onClick={() => void copy("card", card.number)}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </dd>
          {card.holder && (
            <p className="text-sm text-navy-500 dark:text-navy-100">
              {t.cardHolder}: <b>{card.holder}</b>
            </p>
          )}
        </div>

        <div className="rounded-xl bg-white p-3 dark:bg-navy-700">
          <dt className="text-xs text-navy-300">{t.amountToPay}</dt>
          <dd className="flex items-center justify-between gap-2">
            <span className="text-lg font-bold text-navy-900 dark:text-white">{formatSom(amount)}</span>
            <Tooltip title={copied === "amount" ? t.copied : t.copy}>
              <IconButton aria-label={`${t.amountToPay} — ${t.copy}`} onClick={() => void copy("amount", rawAmount)}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </dd>
        </div>
      </dl>

      {card.note && <p className="mt-3 text-sm text-navy-500 dark:text-navy-100">{card.note}</p>}

      {/* Holat - ekran o'quvchi yangilanishni o'qisin. */}
      <div aria-live="polite" className="mt-4">
        {paymentStatus === "failed" && <Alert severity="warning">{t.failed}</Alert>}
        {paymentStatus === "pending" && hasReceipt && <Alert severity="info">{t.receiptUploaded}</Alert>}
        {error && (
          <Alert severity="error" className="mt-2">
            {error}
          </Alert>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        variant={hasReceipt ? "outlined" : "contained"}
        size="large"
        fullWidth
        className="!mt-4"
        startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <UploadFileIcon />}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? t.uploading : hasReceipt ? t.reupload : t.uploadReceipt}
      </Button>
    </div>
  );
}
