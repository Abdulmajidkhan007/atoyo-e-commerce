"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import {
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
} from "@mui/material";
import { getOrdersPage } from "@/lib/firebase/firestore";
import type { Order, OrderStatus } from "@/types/order";
import { formatSom } from "@/lib/format";

const STATUS_OPTIONS: { value: OrderStatus; label: string; color: "default" | "success" | "info" | "warning" | "error" }[] = [
  { value: "pending", label: "Kutilmoqda", color: "warning" },
  { value: "approved", label: "Qabul qilindi", color: "info" },
  { value: "delivering", label: "Yetkazilmoqda", color: "info" },
  { value: "completed", label: "Yakunlandi", color: "success" },
  { value: "cancelled", label: "Bekor qilindi", color: "error" },
];

const PAGE_SIZE = 20;

export function AdminOrdersTable() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  /** Qaytarish/holat o'zgartirishdagi xato matni. */
  const [actionError, setActionError] = useState<string | null>(null);

  // Sana oralig'i epoch millis'ga o'giriladi ("to" kun oxirigacha).
  const dateRange = {
    from: fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : undefined,
    to: toDate ? new Date(`${toDate}T23:59:59`).getTime() : undefined,
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const page = await getOrdersPage(statusFilter || undefined, PAGE_SIZE, null, {
          from: fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : undefined,
          to: toDate ? new Date(`${toDate}T23:59:59`).getTime() : undefined,
        });
        if (cancelled) return;
        setOrders(page.orders);
        setCursor(page.lastCursor);
        setHasMore(page.hasMore);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, fromDate, toDate]);

  const loadMore = async () => {
    setIsLoading(true);
    try {
      const page = await getOrdersPage(statusFilter || undefined, PAGE_SIZE, cursor, dateRange);
      setOrders((prev) => [...prev, ...page.orders]);
      setCursor(page.lastCursor);
      setHasMore(page.hasMore);
    } finally {
      setIsLoading(false);
    }
  };

  // Ism/telefon/ID qidiruvi - yuklangan sahifalar ustidan client tomonda.
  const search = searchTerm.trim().toLowerCase();
  const visibleOrders = search
    ? orders.filter(
        (o) =>
          o.customerName.toLowerCase().includes(search) ||
          o.phoneNumber.toLowerCase().includes(search) ||
          o.id.toLowerCase().startsWith(search)
      )
    : orders;

  /**
   * QAYTARISH - butun buyurtma bo'yicha (qisman qaytarish uchun sababga
   * "1 dona X" deb yozib qo'yish mumkin, keyinchalik qatorlar bo'yicha
   * oyna qo'shiladi).
   */
  const handleReturn = async (order: Order) => {
    const reason = window.prompt(
      `#${order.id.slice(0, 8)} — qaytarish sababi (mahsulotlar zaxiraga qaytadi, tushum kamayadi):`,
      ""
    );
    if (reason === null) return;

    setUpdatingOrderId(order.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Qaytarib bo'lmadi.");
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, refundAmount: (o.refundAmount ?? 0) + (data.refundAmount ?? 0) }
            : o
        )
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Qaytarib bo'lmadi.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("failed");
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FormControl size="small" className="min-w-48">
          <InputLabel id="status-filter">Status bo&apos;yicha filtr</InputLabel>
          <Select
            labelId="status-filter"
            label="Status bo'yicha filtr"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}
          >
            <MenuItem value="">Barchasi</MenuItem>
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="date"
          label="Dan"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="date"
          label="Gacha"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          placeholder="Ism / telefon / ID qidirish"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="min-w-56 flex-1"
        />
      </div>

      <div className="flex flex-col gap-3">
        {visibleOrders.map((order) => (
          <div key={order.id} className="rounded-xl2 border border-navy-100 bg-white p-4 dark:border-navy-500 dark:bg-navy-700">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium text-navy-900 dark:text-white">#{order.id.slice(0, 8)}</span>
                <span className="ml-2 text-sm text-navy-300">{order.customerName} • {order.phoneNumber}</span>
              </div>
              <Chip
                size="small"
                label={STATUS_OPTIONS.find((s) => s.value === order.status)?.label}
                color={STATUS_OPTIONS.find((s) => s.value === order.status)?.color}
              />
            </div>

            <p className="mb-3 text-sm text-navy-300">
              {order.items.length} ta mahsulot • {formatSom(order.totalAmount)}
              {order.refundAmount ? (
                <span className="text-red-500"> • qaytarilgan: {formatSom(order.refundAmount)}</span>
              ) : null}
            </p>

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  size="small"
                  variant={order.status === opt.value ? "contained" : "outlined"}
                  disabled={updatingOrderId === order.id || order.status === opt.value}
                  onClick={() => handleStatusChange(order.id, opt.value)}
                >
                  {opt.label}
                </Button>
              ))}

              {/* Chek: chop etish yoki PDF sifatida saqlash */}
              <Button size="small" variant="text" component={Link} href={`/chek/${order.id}`} target="_blank">
                Chek
              </Button>

              {/* Qaytarish: yetkazilgan buyurtmadan mahsulot qaytganda -
                  zaxira va tushum tuzatiladi (bekor qilish emas). */}
              <Button
                size="small"
                variant="text"
                color="warning"
                disabled={updatingOrderId === order.id}
                onClick={() => handleReturn(order)}
              >
                Qaytarish
              </Button>
            </div>
          </div>
        ))}
      </div>

      {actionError && (
        <p className="py-2 text-sm text-red-500">{actionError}</p>
      )}

      {isLoading && (
        <div className="flex justify-center py-6">
          <CircularProgress size={24} />
        </div>
      )}

      {!isLoading && visibleOrders.length === 0 && (
        <p className="py-8 text-center text-sm text-navy-300">Buyurtmalar topilmadi.</p>
      )}

      {!isLoading && hasMore && (
        <div className="flex justify-center py-4">
          <Button onClick={loadMore}>Ko&apos;proq yuklash</Button>
        </div>
      )}
    </div>
  );
}
