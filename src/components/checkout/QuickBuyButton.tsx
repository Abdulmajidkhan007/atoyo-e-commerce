"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useAppSelector } from "@/redux/hooks";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { localeHref } from "@/lib/i18n/href";
import { useDelivery } from "@/lib/delivery/useDelivery";
import { freeDeliveryGap } from "@/lib/delivery/text";
import { deliveryFeeFor } from "@/lib/orders/promo";
import { isValidName, normalizePhone } from "@/lib/validation";
import { formatSom } from "@/lib/format";

export interface QuickBuyItem {
  productId: string;
  variantId?: string | null;
  variantLabel?: string | null;
  name: string;
  /** Mijozga ko'rinadigan narx — server baribir QAYTA hisoblaydi. */
  price: number;
  thumbnailUrl: string;
  stock: number;
}

/**
 * "1 KLIKDA SOTIB OLISH" — ro'yxatdan o'tmasdan buyurtma.
 *
 * evde.uz'da faqat ism + telefon so'raladi va operator qo'ng'iroq
 * qiladi. Egasining qarori: bizda TO'LIQ ma'lumot olinadi (ism,
 * telefon, manzil, to'lov usuli), shunda operator hech narsani qayta
 * so'ramaydi. To'lov: naqd yoki kartaga o'tkazma (sozlamada yoqilgan
 * bo'lsa) — o'tkazmada mijoz buyurtma sahifasiga o'tib, karta va chek
 * yuklash joyini ko'radi (`/buyurtma/<id>?t=...`).
 *
 * Yetkazish narxi OLDINDAN ko'rsatiladi (15 000 yoki bepul) — mijoz
 * summani buyurtmadan keyin emas, oldin bilsin.
 */
export function QuickBuyButton({ item, disabled = false }: { item: QuickBuyItem; disabled?: boolean }) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.payment;
  const titleId = useId();
  const delivery = useDelivery();
  const profile = useAppSelector((s) => s.user.profile);

  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState(""); // bot tuzog'i
  const [payment, setPayment] = useState<"cash" | "transfer">("cash");
  const [transferEnabled, setTransferEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Oyna ochilganda: o'tkazma bormi + kirgan mijoz ma'lumotlari.
  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch("/api/payment-info")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { transfer?: unknown } | null) => {
        if (active) setTransferEnabled(Boolean(data?.transfer));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open]);

  const openDialog = () => {
    setError(null);
    setQuantity(1);
    if (profile) {
      setName((current) => current || profile.displayName || "");
      setPhone((current) => (current.trim() === "+998" && profile.phoneNumber ? profile.phoneNumber : current));
    }
    setOpen(true);
  };

  const maxQuantity = Math.max(1, Math.min(item.stock, 99));
  const subtotal = item.price * quantity;
  const fee = deliveryFeeFor(delivery, subtotal);
  const gap = freeDeliveryGap(delivery, subtotal);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isValidName(name)) {
      setError(dict.checkout.invalidName);
      return;
    }
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError(dict.checkout.invalidPhone);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          phoneNumber: normalized,
          deliveryAddress: address.trim(),
          paymentMethod: payment,
          website,
          items: [
            {
              productId: item.productId,
              variantId: item.variantId ?? null,
              name: item.name,
              price: item.price,
              quantity,
              thumbnailUrl: item.thumbnailUrl,
            },
          ],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { orderId?: string; accessToken?: string; error?: string };
      if (!res.ok || !data.orderId) throw new Error(data.error ?? dict.checkout.submitError);
      router.push(
        localeHref(`/buyurtma/${data.orderId}?t=${encodeURIComponent(data.accessToken ?? "")}`, locale)
      );
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : dict.checkout.submitError);
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size="large"
        startIcon={<BoltIcon />}
        disabled={disabled || item.stock <= 0}
        onClick={openDialog}
        className="!w-fit"
      >
        {t.quickBuy}
      </Button>

      <Dialog
        open={open}
        onClose={() => !submitting && setOpen(false)}
        fullWidth
        maxWidth="xs"
        aria-labelledby={titleId}
        slotProps={{ paper: { className: "!rounded-2xl" } }}
      >
        <DialogTitle id={titleId} className="!pr-12">
          {t.quickBuyTitle}
          <span className="block text-sm font-normal text-navy-300">{t.quickBuySubtitle}</span>
          <IconButton
            aria-label={dict.common.close}
            onClick={() => setOpen(false)}
            disabled={submitting}
            className="!absolute !right-2 !top-2"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <form onSubmit={submit} className="flex flex-col gap-3 pt-1">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-navy-50 p-3 dark:bg-navy-800">
              <span className="min-w-0 text-sm text-navy-900 dark:text-white">
                {item.name}
                {item.variantLabel ? ` · ${item.variantLabel}` : ""}
                <span className="block text-xs text-navy-300">{formatSom(item.price)}</span>
              </span>
              <span className="flex shrink-0 items-center" role="group" aria-label={t.quantity}>
                <IconButton
                  size="small"
                  aria-label="−1"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                <span aria-live="polite" className="w-7 text-center font-semibold">
                  {quantity}
                </span>
                <IconButton
                  size="small"
                  aria-label="+1"
                  onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                  disabled={quantity >= maxQuantity}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </span>
            </div>

            <TextField
              label={dict.checkout.fullName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              size="small"
            />
            <TextField
              label={dict.checkout.phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
              inputMode="tel"
              size="small"
            />
            <TextField
              label={dict.checkout.address}
              placeholder={dict.checkout.addressPlaceholder}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              multiline
              minRows={2}
              autoComplete="street-address"
              size="small"
            />
            {/* Bot tuzog'i: odam ko'rmaydi, ekran o'quvchi o'qimaydi. */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
              placeholder={t.honeypot}
            />

            <RadioGroup
              value={payment}
              onChange={(e) => setPayment(e.target.value as "cash" | "transfer")}
              aria-label={dict.checkout.paymentTitle}
            >
              <FormControlLabel value="cash" control={<Radio size="small" />} label={dict.checkout.payCash} />
              {transferEnabled && (
                <FormControlLabel value="transfer" control={<Radio size="small" />} label={t.payTransfer} />
              )}
            </RadioGroup>
            {payment === "transfer" && <p className="-mt-2 text-xs text-navy-300">{t.transferHint}</p>}

            <div className="flex flex-col gap-1 border-t border-navy-100 pt-3 text-sm dark:border-navy-500">
              <p className="flex justify-between text-navy-500 dark:text-navy-100">
                <span>{t.delivery}</span>
                <span>{fee > 0 ? formatSom(fee) : t.free}</span>
              </p>
              {gap && gap.remaining > 0 && (
                <p className="text-xs text-aqua-700 dark:text-aqua-300">
                  {dict.cart.freeDeliveryLeft.replace("{amount}", formatSom(gap.remaining))}
                </p>
              )}
              <p className="flex justify-between text-base font-bold text-navy-900 dark:text-white">
                <span>{t.total}</span>
                <span>{formatSom(subtotal + fee)}</span>
              </p>
            </div>

            {error && (
              <Alert severity="error" role="alert">
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {submitting ? t.sending : t.submitQuick}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
