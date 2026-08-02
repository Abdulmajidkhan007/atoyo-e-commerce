import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { Analytics } from "@/components/analytics/Analytics";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Atoyo Santexnika | Santexnika va Otopleniye Do'koni",
  description:
    "Quvurlar, muftalar, kranlar, dush tizimlari va isitish qozonlari - eng sifatli santexnika mahsulotlari.",
};

/**
 * Sahifa bo'yalishidan OLDIN saqlangan temani <html> ga qo'llaydi -
 * aks holda dark-mode foydalanuvchilar har ochilishda bir lahza oq
 * ("flash") sahifa ko'radi. redux-persist saqlagan qiymatni o'qiydi.
 * Tailwind `dark:` variantlari istalgan ota elementdagi .dark klassga
 * mos keladi, shuning uchun <html> dagi klass yetarli.
 */
const THEME_INIT_SCRIPT = `
try {
  var s = localStorage.getItem('persist:atoyo-root');
  if (s && JSON.parse(JSON.parse(s).ui).themeMode === 'dark') {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={inter.variable}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Providers>{children}</Providers>
        {/* NEXT_PUBLIC_GA_ID qo'yilgan bo'lsagina yuklanadi. */}
        <Analytics />
      </body>
    </html>
  );
}
