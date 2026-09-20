"use client";

import { createContext, useContext } from "react";

/**
 * SAYT SOZLAMALARINING MIJOZ TOMONIGA KERAK BO'LGAN QISMI.
 *
 * `(main)/layout.tsx` (server) sozlamani allaqachon o'qiydi -
 * shuning uchun client komponentlar uchun qo'shimcha so'rov kerak
 * emas, qiymat shu kontekst orqali pastga uzatiladi.
 *
 * MUHIM: bu yerga FAQAT ochiq ma'lumot qo'yiladi. Maxfiy narsa
 * (kalit, tannarx, ustama foizi) mijozga umuman yuborilmaydi —
 * `CLAUDE.md` 1-qoida.
 */
export interface SiteInfo {
  /** Bosh sahifadagi "N+ mahsulot" yozuvi. Bo'sh — ko'rsatilmaydi. */
  catalogSizeLabel: string;
}

const SiteInfoContext = createContext<SiteInfo>({ catalogSizeLabel: "" });

export function SiteInfoProvider({
  value,
  children,
}: {
  value: SiteInfo;
  children: React.ReactNode;
}) {
  return <SiteInfoContext.Provider value={value}>{children}</SiteInfoContext.Provider>;
}

export function useSiteInfo(): SiteInfo {
  return useContext(SiteInfoContext);
}
