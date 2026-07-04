"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, Button, Chip } from "@mui/material";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { subscribeToUserOrders } from "@/lib/firebase/firestore";
import { signOutUser } from "@/lib/firebase/auth";
import { signOut as signOutAction } from "@/redux/slices/userSlice";
import type { Order, OrderStatus } from "@/types/order";

const STATUS_LABELS: Record<OrderStatus, { label: string; color: "default" | "success" | "info" | "warning" | "error" }> = {
  pending: { label: "Kutilmoqda", color: "warning" },
  approved: { label: "Qabul qilindi", color: "info" },
  delivering: { label: "Yetkazilmoqda", color: "info" },
  completed: { label: "Yakunlandi", color: "success" },
  cancelled: { label: "Bekor qilindi", color: "error" },
};

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

const PAYMENT_LABELS: Record<Order["paymentMethod"], string> = {
  cash: "💵 Naqd",
  online: "💳 Onlayn",
};

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const { profile, status } = useAppSelector((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const unsubscribe = subscribeToUserOrders(profile.uid, setOrders);
    return unsubscribe;
  }, [profile]);

  if (status === "unauthenticated") {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-4 text-navy-300">Profilni ko&apos;rish uchun tizimga kiring.</p>
        <Button component={Link} href="/kirish" variant="contained">Kirish</Button>
      </section>
    );
  }

  if (!profile) {
    return <section className="mx-auto max-w-5xl px-4 py-16 text-center text-navy-300">Yuklanmoqda...</section>;
  }

  const handleSignOut = async () => {
    await signOutUser();
    dispatch(signOutAction());
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Avatar src={profile.photoURL ?? undefined} sx={{ width: 64, height: 64 }}>
          {profile.displayName?.[0] ?? profile.email?.[0] ?? "U"}
        </Avatar>
        <div className="flex-1">
          <p className="text-lg font-bold text-navy-900 dark:text-white">{profile.displayName ?? "Foydalanuvchi"}</p>
          <p className="text-sm text-navy-300">{profile.email}</p>
          {profile.phoneNumber && <p className="text-sm text-navy-300">{profile.phoneNumber}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Button component={Link} href="/profil/sozlamalar" variant="outlined" size="small">Tahrirlash</Button>
          <Button onClick={handleSignOut} variant="text" size="small" color="error">Chiqish</Button>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-navy-900 dark:text-white">Buyurtmalar tarixi</h2>

      {orders.length === 0 ? (
        <p className="text-sm text-navy-300">Sizda hali buyurtmalar yo&apos;q.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const isOpen = expandedId === order.id;
            return (
              <div key={order.id} className="rounded-xl2 border border-navy-100 bg-white dark:border-navy-500 dark:bg-navy-700">
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : order.id)}
                  className="flex w-full items-center justify-between gap-2 p-4 text-left"
                >
                  <div>
                    <span className="text-sm font-medium text-navy-900 dark:text-white">Buyurtma #{order.id.slice(0, 8)}</span>
                    <p className="text-sm text-navy-300">
                      {order.items.length} ta mahsulot • {formatSom(order.totalAmount)} • {new Date(order.createdAt).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                  <Chip size="small" label={STATUS_LABELS[order.status].label} color={STATUS_LABELS[order.status].color} />
                </button>

                {isOpen && (
                  <div className="border-t border-navy-100 px-4 py-3 dark:border-navy-500">
                    <ul className="flex flex-col gap-1 text-sm text-navy-500 dark:text-navy-100">
                      {order.items.map((item) => (
                        <li key={item.productId} className="flex justify-between gap-2">
                          <span className="line-clamp-1">{item.name} × {item.quantity}</span>
                          <span className="whitespace-nowrap">{formatSom(item.price * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-col gap-1 border-t border-navy-100 pt-2 text-xs text-navy-300 dark:border-navy-500">
                      <span>To&apos;lov: {PAYMENT_LABELS[order.paymentMethod]}</span>
                      {order.deliveryAddress && <span>Manzil: {order.deliveryAddress}</span>}
                      {order.location && (
                        <a
                          href={`https://maps.google.com/?q=${order.location.latitude},${order.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-aqua-600 hover:underline dark:text-aqua-300"
                        >
                          📍 Xaritada ko&apos;rish
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
