import type { Metadata } from "next";

/** Kontakt sahifasi client komponent - SEO ma'lumotlari shu yerda. */
export const metadata: Metadata = {
  title: "Bog'lanish",
  description:
    "Atoyo Santexnika bilan bog'laning: telefon, manzil va ariza qoldirish. Savolingizga operator javob beradi. Свяжитесь с нами: телефон, адрес, заявка.",
  alternates: { canonical: "/kontakt" },
  openGraph: {
    title: "Bog'lanish — Atoyo Santexnika",
    description: "Telefon, manzil va ariza qoldirish. Operator qisqa vaqtda javob beradi.",
  },
};

export default function KontaktLayout({ children }: { children: React.ReactNode }) {
  return children;
}
