import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import { getLocale } from "@/lib/i18n/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd } from "@/lib/seo/json-ld";

// Footer admin tomonidan tahrirlanadigan sayt sozlamalarini (kontakt,
// ijtimoiy tarmoqlar) jonli o'qiydi, shuning uchun bu layout ostidagi
// sahifalar so'rov paytida render qilinadi (admin o'zgarishlari darhol
// ko'rinadi, build vaqtidagi eski qiymatlar qotib qolmaydi).
export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <LocaleProvider initialLocale={locale}>
      {/* Do'kon va sayt haqidagi sxema - hamma sahifada. */}
      <JsonLd data={organizationJsonLd()} />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <Footer />
        <MobileBottomNav />
      </div>
    </LocaleProvider>
  );
}
