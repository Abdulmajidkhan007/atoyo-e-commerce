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

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const { profile, status } = useAppSelector((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);

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
        </div>
        <Button onClick={handleSignOut} variant="outlined" size="small">Chiqish</Button>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-navy-900 dark:text-white">Buyurtmalar tarixi</h2>

      {orders.length === 0 ? (
        <p className="text-sm text-navy-300">Sizda hali buyurtmalar yo&apos;q.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-navy-900 dark:text-white">
                  Buyurtma #{order.id.slice(0, 8)}
                </span>
                <Chip size="small" label={STATUS_LABELS[order.status].label} color={STATUS_LABELS[order.status].color} />
              </div>
              <p className="text-sm text-navy-300">{order.items.length} ta mahsulot • {formatSom(order.totalAmount)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
