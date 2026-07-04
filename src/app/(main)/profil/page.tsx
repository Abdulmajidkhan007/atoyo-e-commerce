"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, Button, Chip } from "@mui/material";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { subscribeToUserOrders } from "@/lib/firebase/firestore";
import { signOutUser } from "@/lib/firebase/auth";
import { signOut as signOutAction } from "@/redux/slices/userSlice";
import { useTranslation } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import type { Order, OrderStatus } from "@/types/order";

const STATUS_COLORS: Record<OrderStatus, "default" | "success" | "info" | "warning" | "error"> = {
  pending: "warning",
  approved: "info",
  delivering: "info",
  completed: "success",
  cancelled: "error",
};

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const t = useTranslation();
  const { profile, status } = useAppSelector((s) => s.user);
  const formatSom = (amount: number) => formatPrice(amount, t.common.currencyUzs);
  const paymentLabels: Record<Order["paymentMethod"], string> = {
    cash: t.profile.paymentCash,
    online: t.profile.paymentOnline,
  };
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
        <p className="mb-4 text-navy-300">{t.profile.signInPrompt}</p>
        <Button component={Link} href="/kirish" variant="contained">{t.nav.login}</Button>
      </section>
    );
  }

  if (!profile) {
    return <section className="mx-auto max-w-5xl px-4 py-16 text-center text-navy-300">{t.common.loading}</section>;
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
          <p className="text-lg font-bold text-navy-900 dark:text-white">{profile.displayName ?? t.profile.defaultName}</p>
          <p className="text-sm text-navy-300">{profile.email}</p>
          {profile.phoneNumber && <p className="text-sm text-navy-300">{profile.phoneNumber}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Button component={Link} href="/profil/sozlamalar" variant="outlined" size="small">{t.profile.edit}</Button>
          <Button onClick={handleSignOut} variant="text" size="small" color="error">{t.profile.signOut}</Button>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-navy-900 dark:text-white">{t.profile.ordersHistory}</h2>

      {orders.length === 0 ? (
        <p className="text-sm text-navy-300">{t.profile.noOrders}</p>
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
                    <span className="text-sm font-medium text-navy-900 dark:text-white">{t.profile.orderLabel} #{order.id.slice(0, 8)}</span>
                    <p className="text-sm text-navy-300">
                      {order.items.length} {t.profile.itemsSuffix} • {formatSom(order.totalAmount)} • {new Date(order.createdAt).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                  <Chip size="small" label={t.profile.status[order.status]} color={STATUS_COLORS[order.status]} />
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
                      <span>{t.profile.payment}: {paymentLabels[order.paymentMethod]}</span>
                      {order.deliveryAddress && <span>{t.profile.address}: {order.deliveryAddress}</span>}
                      {order.location && (
                        <a
                          href={`https://maps.google.com/?q=${order.location.latitude},${order.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-aqua-600 hover:underline dark:text-aqua-300"
                        >
                          {t.profile.viewOnMap}
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
