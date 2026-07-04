"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TextField,
  Button,
  Alert,
  CircularProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { clearCart } from "@/redux/slices/cartSlice";
import { useTranslation } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const t = useTranslation();
  const items = useAppSelector((s) => s.cart.items);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const formatSom = (amount: number) => formatPrice(amount, t.common.currencyUzs);

  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleDetectLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError(t.checkout.geoUnsupported);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setLocationError(t.checkout.geoFailed)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phoneNumber,
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            thumbnailUrl: item.thumbnailUrl,
          })),
          location,
          deliveryAddress: deliveryAddress.trim() || null,
          paymentMethod,
        }),
      });

      if (!response.ok) throw new Error("Buyurtma yuborilmadi.");

      dispatch(clearCart());
      router.push("/profil");
    } catch {
      setSubmitError(t.checkout.submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-navy-300">{t.checkout.emptyCart}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-navy-900 dark:text-white">{t.checkout.title}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label={t.checkout.fullName}
          required
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <TextField
          label={t.checkout.phone}
          required
          placeholder="+998901234567"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <div>
          <Button type="button" onClick={handleDetectLocation} startIcon={<MyLocationIcon />} variant="outlined" size="small">
            {location ? t.checkout.locationDetected : t.checkout.detectLocation}
          </Button>
          {locationError && <p className="mt-1 text-xs text-red-500">{locationError}</p>}
        </div>

        <TextField
          label={t.checkout.deliveryAddress}
          placeholder={t.checkout.deliveryAddressPlaceholder}
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          multiline
          minRows={2}
        />

        <div className="rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
          <p className="mb-2 text-sm font-medium text-navy-900 dark:text-white">{t.checkout.paymentMethod}</p>
          <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "cash" | "online")}>
            <FormControlLabel value="cash" control={<Radio />} label={t.checkout.paymentCash} />
            <FormControlLabel value="online" control={<Radio />} label={t.checkout.paymentOnline} />
          </RadioGroup>
          {paymentMethod === "online" && (
            <p className="mt-1 text-xs text-navy-300">{t.checkout.onlineNote}</p>
          )}
        </div>

        <div className="rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
          <div className="flex justify-between text-lg font-bold text-navy-900 dark:text-white">
            <span>{t.checkout.totalPayment}</span>
            <span>{formatSom(totalAmount)}</span>
          </div>
        </div>

        {submitError && <Alert severity="error">{submitError}</Alert>}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : t.checkout.confirm}
        </Button>
      </form>
    </section>
  );
}
