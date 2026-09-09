import type { Metadata } from "next";
import { siteDescription } from "@/lib/seo/metadata";
import { getSiteSettings } from "@/lib/firebase/admin-content";

/**
 * KATALOG SAHIFASINING META MA'LUMOTI.
 *
 * Sahifaning o'zi `"use client"` (filtrlar Redux'da), shuning uchun
 * undan `metadata` eksport qilib bo'lmaydi — layout orqali beriladi.
 *
 * MUHIM: `canonical` ATAYLAB shu yerda belgilanadi. Root layout'da
 * `canonical: "/"` turibdi va Next.js uni bolaga MEROS qiladi —
 * ya'ni canonical'siz katalog o'zini BOSH SAHIFA deb e'lon qilardi
 * va Google ikkalasini dublikat deb hisoblardi. Filtr/qidiruv
 * (`?q=`, `?brand=`) ham shu bitta manzilga yig'iladi.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings().catch(() => null);
  return {
    title: "Katalog — santexnika va isitish mahsulotlari",
    description: siteDescription(settings?.address),
    alternates: { canonical: "/katalog" },
  };
}

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
