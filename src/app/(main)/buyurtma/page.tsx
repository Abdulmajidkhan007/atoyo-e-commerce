"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { ensureSessionCookie } from "@/lib/firebase/auth";
import { useI18n } from "@/lib/i18n/LocaleContext";

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const { profile, status } = useAppSelector((s) => s.user);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Profil ma'lumotlaridan avtoto'ldirish - admin buyurtma kimdan
  // kelganini aniq bilishi uchun (foydalanuvchi o'zgartira oladi).
  useEffect(() => {
    function prefillFromProfile() {
      if (!profile) return;
      setCustomerName((prev) => prev || profile.displayName || "");
      setPhoneNumber((prev) => prev || profile.phoneNumber || "");
      setDeliveryAddress((prev) => prev || profile.homeAddress || "");
    }
    prefillFromProfile();
  }, [profile]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleDetectLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError(dict.checkout.locationUnsupported);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setLocationError(dict.checkout.locationFailed)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Cookie eskirgan bo'lsa yangilaymiz - aks holda buyurtma egasiz
      // (userId=null) saqlanib, profildagi tarixda ko'rinmay qolardi.
      await ensureSessionCookie();
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
      const { orderId } = await response.json();

      dispatch(clearCart());
      // Onlayn to'lovda mijoz Payme/Click tanlash sahifasiga yo'naltiriladi.
      router.push(paymentMethod === "online" && orderId ? `/tolov/${orderId}` : "/profil");
    } catch {
      setSubmitError(dict.checkout.submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buyurtma faqat tizimga kirgan foydalanuvchilar uchun.
  if (status === "unauthenticated") {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-4 text-navy-300">{dict.checkout.loginRequired}</p>
        <Button component={Link} href="/kirish" variant="contained" size="large">
          {dict.nav.login}
        </Button>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-navy-300">{dict.checkout.addFirst}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-navy-900 dark:text-white">{dict.checkout.title}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label={dict.checkout.fullName}
          required
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <TextField
          label={dict.checkout.phone}
          required
          placeholder="+998901234567"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <div>
          <Button type="button" onClick={handleDetectLocation} startIcon={<MyLocationIcon />} variant="outlined" size="small">
            {location ? dict.checkout.locationDetected : dict.checkout.detectLocation}
          </Button>
          {locationError && <p className="mt-1 text-xs text-red-500">{locationError}</p>}
        </div>

        <TextField
          label={dict.checkout.address}
          placeholder={dict.checkout.addressPlaceholder}
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          multiline
          minRows={2}
        />

        <div className="rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
          <p className="mb-2 text-sm font-medium text-navy-900 dark:text-white">{dict.checkout.paymentTitle}</p>
          <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "cash" | "online")}>
            <FormControlLabel value="cash" control={<Radio />} label={dict.checkout.payCash} />
            <FormControlLabel value="online" control={<Radio />} label={dict.checkout.payOnline} />
          </RadioGroup>
          {paymentMethod === "online" && (
            <p className="mt-1 text-xs text-navy-300">{dict.checkout.onlineNote}</p>
          )}
        </div>

        <div className="rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
          <div className="flex justify-between text-lg font-bold text-navy-900 dark:text-white">
            <span>{dict.checkout.total}</span>
            <span>{formatSom(totalAmount)}</span>
          </div>
        </div>

        {submitError && <Alert severity="error">{submitError}</Alert>}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : dict.checkout.confirm}
        </Button>
      </form>
    </section>
  );
}
