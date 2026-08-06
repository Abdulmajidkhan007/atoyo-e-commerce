import type { Metadata } from "next";
import { TvScreen } from "@/components/tv/TvScreen";

/**
 * DO'KONDAGI TELEVIZOR uchun sahifa.
 *
 * Manzil: https://atoyo-uz.web.app/tv — televizor brauzeri (yoki
 * Android TV box) kiosk rejimida shuni ochadi. Sahifa saytning
 * header/footer'isiz, butun ekranni egallaydi va o'zini o'zi
 * yangilaydi (tartib `docs/TV.md` da).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Do'kon ekrani",
  // Reklama ekrani qidiruvga tushmasligi kerak - u mijoz uchun emas.
  robots: { index: false, follow: false },
};

export default function TvPage() {
  return <TvScreen />;
}
