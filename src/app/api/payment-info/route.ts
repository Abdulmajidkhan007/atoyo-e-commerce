import { NextResponse } from "next/server";
import { getTransferSettings } from "@/lib/payments/transfer";
import { isTransferUsable } from "@/types/payment-transfer";
import { publicCacheHeaders } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Qaysi to'lov usullari bor (checkout va 1-klik oynasi uchun).
 *
 * Karta raqami SIR EMAS — u mijoz pul o'tkazishi uchun ko'rsatiladi.
 * Shunga qaramay u faqat o'tkazma YOQILGAN bo'lsa beriladi. Javob
 * hammaga bir xil — CDN 60 soniya keshlaydi (karta almashsa bir
 * daqiqada yangilanadi).
 */
export async function GET() {
  const settings = await getTransferSettings();
  const transfer = isTransferUsable(settings)
    ? {
        cardNumber: settings.cardNumber,
        cardHolder: settings.cardHolder,
        bankName: settings.bankName,
        note: settings.note,
      }
    : null;
  return NextResponse.json({ transfer }, { headers: publicCacheHeaders(60) });
}
