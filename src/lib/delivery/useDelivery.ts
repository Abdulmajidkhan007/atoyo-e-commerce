"use client";

import { useEffect, useState } from "react";
import { DEFAULT_DELIVERY_SETTINGS, type DeliverySettings } from "@/types/promo";
import { withDeliveryDefaults } from "./text";

/**
 * Yetkazish sozlamalari (client). Server javobi kelguncha STANDART
 * qiymatlar qaytadi - shuning uchun matn "sakramaydi" va sozlama
 * o'qib bo'lmasa ham mijoz va'dani ko'radi.
 *
 * `/api/delivery` 5 daqiqa keshlanadi (`publicCacheHeaders`), ya'ni
 * har sahifada yangi so'rov ketmaydi.
 */
export function useDelivery(): DeliverySettings {
  const [settings, setSettings] = useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);

  useEffect(() => {
    let active = true;
    fetch("/api/delivery")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { delivery?: Partial<DeliverySettings> } | null) => {
        if (active && data?.delivery) setSettings(withDeliveryDefaults(data.delivery));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return settings;
}
