import type { Metadata } from "next";
import { cityFromAddress } from "@/lib/seo/json-ld";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { getLocale } from "@/lib/i18n/server";
import { localeAlternates } from "@/lib/seo/locale-alternates";

/**
 * KONTAKT SAHIFASINING META MA'LUMOTI.
 *
 * Sahifa `"use client"` (forma), shuning uchun layout orqali.
 * Manzil va telefon admin sozlamasidan olinadi — mahalliy qidiruvda
 * ("santexnika Qo'qon") aynan shu matn ko'rinadi.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [settings, locale] = await Promise.all([
    getSiteSettings().catch(() => null),
    getLocale(),
  ]);
  const city = cityFromAddress(settings?.address);
  const parts = [
    city ? `Do'kon manzili: ${settings?.address}.` : null,
    settings?.phone ? `Telefon: ${settings.phone}.` : null,
    "Savol va buyurtma uchun bog'laning — yetkazib berish va o'rnatish xizmati bor.",
  ].filter(Boolean);

  return {
    title: city ? `Kontakt — ${city}` : "Kontakt",
    description: parts.join(" "),
    alternates: localeAlternates("/kontakt", locale),
  };
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
