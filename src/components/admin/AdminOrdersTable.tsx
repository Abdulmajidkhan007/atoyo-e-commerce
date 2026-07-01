"use client";

import { useEffect, useState } from "react";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import {
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { getOrdersPage } from "@/lib/firebase/firestore";
import type { Order, OrderStatus } from "@/types/order";

const STATUS_OPTIONS: { value: OrderStatus; label: string; color: "default" | "success" | "info" | "warning" | "error" }[] = [
  { value: "pending", label: "Kutilmoqda", color: "warning" },
  { value: "approved", label: "Qabul qilindi", color: "info" },
  { value: "delivering", label: "Yetkazilmoqda", color: "info" },
  { value: "completed", label: "Yakunlandi", color: "success" },
  { value: "cancelled", label: "Bekor qilindi", color: "error" },
];

function formatSom(amount: number): string {
  return `${amount.toLocaleString("uz-UZ")} so'm`;
}

const PAGE_SIZE = 20;

export function AdminOrdersTable() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const page = await getOrdersPage(statusFilter || undefined, PAGE_SIZE, null);
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
  }, [statusFilter]);

  const loadMore = async () => {
    setIsLoading(true);
    try {
      const page = await getOrdersPage(statusFilter || undefined, PAGE_SIZE, cursor);
      setOrders((prev) => [...prev, ...page.orders]);
      setCursor(page.lastCursor);
      setHasMore(page.hasMore);
    } finally {
      setIsLoading(false);
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
      <div className="mb-4">
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
      </div>

      <div className="flex flex-col gap-3">
        {orders.map((order) => (
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
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <CircularProgress size={24} />
        </div>
      )}

      {!isLoading && orders.length === 0 && (
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
