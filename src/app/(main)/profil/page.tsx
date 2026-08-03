"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Button, Chip } from "@mui/material";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { subscribeToUserOrders } from "@/lib/firebase/firestore";
import { signOutUser, ensureSessionCookie } from "@/lib/firebase/auth";
import { isStaff } from "@/lib/permissions";
import { signOut as signOutAction } from "@/redux/slices/userSlice";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { SavedCards } from "@/components/profile/SavedCards";
import type { Order, OrderStatus } from "@/types/order";

const STATUS_COLORS: Record<OrderStatus, "default" | "success" | "info" | "warning" | "error"> = {
  pending: "warning",
  approved: "info",
  delivering: "info",
  completed: "success",
  cancelled: "error",
};

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { dict } = useI18n();
  const { profile, status } = useAppSelector((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Mijoz o'z buyurtmasini bekor qiladi (faqat yetkazish boshlanmagan bo'lsa).
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm(dict.profile.cancelConfirm)) return;
    setCancellingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? dict.common.errorRetry);
        return;
      }
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)));
    } finally {
      setCancellingId(null);
    }
  };

  /**
   * XODIM (owner yoki admin) uchun profil sahifasi emas - boshqaruv
   * paneli. `isStaff` ishlatilishi muhim: loyiha egasining roli "owner"
   * (yoki hujjatida hali "user" turgan bo'lishi ham mumkin - u emaili
   * bo'yicha aniqlanadi), shuning uchun `role === "admin"` tekshiruvi
   * uni o'tkazib yuborardi.
   *
   * Ikkinchi nozik joy: /admin ni Proxy `__session` cookie bo'yicha
   * qo'riqlaydi. Cookie faqat kirish paytida o'rnatiladi va 14 kundan
   * keyin eskiradi - eskirgan bo'lsa /admin jimgina bosh sahifaga
   * qaytarardi. Shu sabab o'tishdan oldin cookie yangilanadi.
   */
  const isAdmin = isStaff(profile);
  const [isOpening, setIsOpening] = useState(false);
  /** Cookie tiklanmadi - qaytadan kirish kerak. */
  const [needsRelogin, setNeedsRelogin] = useState(false);

  const openAdminPanel = useCallback(async () => {
    setIsOpening(true);
    if (await ensureSessionCookie()) {
      router.replace("/admin");
      return;
    }
    setNeedsRelogin(true);
    setIsOpening(false);
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    ensureSessionCookie()
      .catch(() => false)
      .then((ok) => {
        if (!active) return;
        if (ok) router.replace("/admin");
        else setNeedsRelogin(true);
      });
    return () => {
      active = false;
    };
  }, [isAdmin, router]);

  useEffect(() => {
    if (!profile) return;
    const unsubscribe = subscribeToUserOrders(profile.uid, setOrders);
    return unsubscribe;
  }, [profile]);

  if (status === "unauthenticated") {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-4 text-navy-300">{dict.profile.loginPrompt}</p>
        <Button component={Link} href="/kirish" variant="contained">{dict.nav.login}</Button>
      </section>
    );
  }

  // Xodim: avtomatik o'tish ishlamay qolsa (masalan cookie tiklanmasa)
  // hech bo'lmasa tugma ko'rinib tursin - "loading" da qotib qolmasin.
  if (isAdmin) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-4 text-navy-300">
          {needsRelogin
            ? "Sessiya eskirgan — boshqaruv paneli uchun qaytadan kiring."
            : isOpening
              ? "Boshqaruv paneliga o'tilmoqda..."
              : "Siz boshqaruv paneliga kira olasiz."}
        </p>
        {needsRelogin ? (
          <Button component={Link} href="/kirish" variant="contained">
            Qaytadan kirish
          </Button>
        ) : (
          <Button onClick={openAdminPanel} variant="contained" disabled={isOpening}>
            Boshqaruv paneli
          </Button>
        )}
      </section>
    );
  }

  if (!profile) {
    return <section className="mx-auto max-w-5xl px-4 py-16 text-center text-navy-300">{dict.common.loading}</section>;
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
          <Button component={Link} href="/profil/sozlamalar" variant="outlined" size="small">{dict.common.edit}</Button>
          <Button onClick={handleSignOut} variant="text" size="small" color="error">{dict.common.logout}</Button>
        </div>
      </div>

      {/* Saqlangan kartalar - to'lov tizimi ulanganda ko'rinadi. */}
      <SavedCards />

      <h2 className="mb-4 text-lg font-semibold text-navy-900 dark:text-white">{dict.profile.ordersTitle}</h2>

      {orders.length === 0 ? (
        <p className="text-sm text-navy-300">{dict.profile.noOrders}</p>
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
                    <span className="text-sm font-medium text-navy-900 dark:text-white">{dict.profile.order} #{order.id.slice(0, 8)}</span>
                    <p className="text-sm text-navy-300">
                      {order.items.length} {dict.profile.itemsCount} • {formatSom(order.totalAmount)} • {new Date(order.createdAt).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                  <Chip size="small" label={dict.profile.status[order.status]} color={STATUS_COLORS[order.status]} />
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
                      <span>{dict.profile.payment}: {order.paymentMethod === "cash" ? dict.profile.cash : dict.profile.online}</span>
                      {order.deliveryAddress && <span>{dict.profile.addressLabel}: {order.deliveryAddress}</span>}
                      {order.location && (
                        <a
                          href={`https://maps.google.com/?q=${order.location.latitude},${order.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-aqua-600 hover:underline dark:text-aqua-300"
                        >
                          {dict.profile.viewOnMap}
                        </a>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="small" variant="outlined" component={Link} href={`/chek/${order.id}`}>
                        {dict.profile.receipt}
                      </Button>

                      {(order.status === "pending" || order.status === "approved") && (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          disabled={cancellingId === order.id}
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          {dict.profile.cancelOrder}
                        </Button>
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
