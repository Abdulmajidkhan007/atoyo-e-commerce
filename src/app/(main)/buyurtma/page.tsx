"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField, Button, Alert, CircularProgress } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { clearCart } from "@/redux/slices/cartSlice";

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleDetectLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Brauzeringiz lokatsiyani aniqlashni qo'llab-quvvatlamaydi.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setLocationError("Lokatsiyani aniqlab bo'lmadi. Ruxsat berilganini tekshiring.")
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
        }),
      });

      if (!response.ok) throw new Error("Buyurtma yuborilmadi.");

      dispatch(clearCart());
      router.push("/profil");
    } catch {
      setSubmitError("Buyurtmani yuborishda xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-navy-300">Buyurtma berish uchun avval savatga mahsulot qo&apos;shing.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-navy-900 dark:text-white">Buyurtmani rasmiylashtirish</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Ism-familiya"
          required
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <TextField
          label="Telefon raqami"
          required
          placeholder="+998901234567"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <div>
          <Button type="button" onClick={handleDetectLocation} startIcon={<MyLocationIcon />} variant="outlined" size="small">
            {location ? "Lokatsiya aniqlandi ✓" : "Joylashuvni aniqlash"}
          </Button>
          {locationError && <p className="mt-1 text-xs text-red-500">{locationError}</p>}
        </div>

        <div className="rounded-xl2 border border-navy-100 p-4 dark:border-navy-500">
          <div className="flex justify-between text-lg font-bold text-navy-900 dark:text-white">
            <span>Jami to&apos;lov</span>
            <span>{formatSom(totalAmount)}</span>
          </div>
        </div>

        {submitError && <Alert severity="error">{submitError}</Alert>}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : "Buyurtmani tasdiqlash"}
        </Button>
      </form>
    </section>
  );
}
