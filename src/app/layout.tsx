import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Providers } from "./providers";
import { Analytics } from "@/components/analytics/Analytics";
import { SITE_NAME, siteUrl } from "@/lib/seo/json-ld";
import { ogImage, siteDescription, SITE_KEYWORDS, SITE_TITLE } from "@/lib/seo/metadata";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { UI_MODE_INIT_SCRIPT, GLASS_INIT_SCRIPT } from "@/lib/ui-mode/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

/**
 * SAYT META MA'LUMOTLARI.
 *
 * `title.template` tufayli ichki sahifalar o'z nomini yozsa yetarli:
 * brauzer yorlig'ida "Moyka hi-tech | Atoyo Santexnika" ko'rinadi.
 * `metadataBase` bo'lmasa Open Graph rasmi nisbiy manzil bilan
 * qolib ketadi va Telegram kartochkani ko'rsatmaydi.
 */
export async function generateMetadata(): Promise<Metadata> {
  // Tavsifdagi SHAHAR admin sozlamasidagi manzildan olinadi - u
  // o'zgarsa Telegram/Google kartochkasi ham o'zgaradi. Sozlama
  // serverda 60 soniya keshlangan, ya'ni bu qo'shimcha so'rov emas.
  const settings = await getSiteSettings().catch(() => null);
  const description = siteDescription(settings?.address);

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: SITE_TITLE,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    keywords: SITE_KEYWORDS,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: siteUrl() }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "shopping",
    alternates: {
      canonical: "/",
      languages: {
        uz: "/",
        "uz-UZ": "/",
        ru: "/",
        en: "/",
      },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: SITE_TITLE,
      description,
      url: siteUrl(),
      locale: "uz_UZ",
      alternateLocale: ["ru_RU", "en_US"],
      images: [ogImage()],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description,
      images: [ogImage().url],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    formatDetection: { telephone: true, address: true, email: true },
  };
}

/** Brauzer manzil satri rangi (mobil qurilmalarda ko'rinadi). */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#04202F" },
  ],
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // CSP nonce - `src/proxy.ts` har so'rovga yangisini yasaydi.
  // Nonce'siz inline skript zamonaviy brauzerda ISHLAMAYDI.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={inter.variable}>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Ko'rinish rejimi (klassik/3D) ham bo'yashdan OLDIN qo'yiladi -
            "klassik" tanlagan mijoz 3D qatlamini bir lahza ham ko'rmaydi. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: UI_MODE_INIT_SCRIPT }} />
        {/* Shisha (glass) ko'rinish sekin qurilmada qattiq fonga
            tushadi - `docs/UI-SHISHA.md`, `lib/ui-mode/config.ts`. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: GLASS_INIT_SCRIPT }} />
        {/* JS ishlamasa skrollda chiqadigan bloklar (Reveal) shaffof
            holda qolib ketmasin - kontent har doim ko'rinishi shart. */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: "<style>[data-reveal]{opacity:1!important;transform:none!important}</style>",
          }}
        />
        {/*
          MUI uslublari SERVERDA chizilgan HTML ichiga qo'shiladi. Busiz
          emotion uslublarni faqat brauzerda, hydration'dan keyin
          joylashtiradi - birinchi ochilishda tugmalar/inputlar bir
          lahza uslubsiz "sakrab" ko'rinadi (sekin internetda ayniqsa
          sezilarli).

          `enableCssLayer` ATAYLAB yoqilmagan: u MUI uslublarini CSS
          qatlamiga (`@layer`) soladi va Tailwind bilan ustunlik
          tartibini o'zgartiradi - saytdagi mavjud `!` prefiksli
          Tailwind override'lari boshqacha ishlab ketishi mumkin.
        */}
        <AppRouterCacheProvider>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
        {/* NEXT_PUBLIC_GA_ID qo'yilgan bo'lsagina yuklanadi. */}
        <Analytics nonce={nonce} />
      </body>
    </html>
  );
}
