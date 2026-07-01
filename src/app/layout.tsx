import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Atoyo Santexnika | Santexnika va Otopleniye Do'koni",
  description:
    "Quvurlar, muftalar, kranlar, dush tizimlari va isitish qozonlari - eng sifatli santexnika mahsulotlari.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
