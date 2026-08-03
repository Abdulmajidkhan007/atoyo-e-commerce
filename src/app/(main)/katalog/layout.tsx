import type { Metadata } from "next";

/**
 * Katalog sahifasi client komponent (filtrlar brauzerda ishlaydi),
 * shuning uchun SEO ma'lumotlari shu layout orqali beriladi.
 */
export const metadata: Metadata = {
  title: "Katalog — santexnika va isitish mahsulotlari",
  description:
    "Quvurlar, muftalar, kranlar, dush tizimlari, radiatorlar va isitish qozonlari. Narx, brend va material bo'yicha filtr; zaxirada bori darhol ko'rinadi. Каталог сантехники и отопления с фильтрами по цене и бренду.",
  alternates: { canonical: "/katalog" },
  openGraph: {
    title: "Katalog — santexnika va isitish mahsulotlari",
    description:
      "10 000+ mahsulot: quvurlar, kranlar, radiatorlar, qozonlar. Filtr, narx va zaxira bir sahifada.",
  },
};

export default function KatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
