import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import { getLocale } from "@/lib/i18n/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { AssistantWidget } from "@/components/ai/AssistantWidget";
import { organizationJsonLd } from "@/lib/seo/json-ld";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { WorldCanvas } from "@/components/world/WorldCanvas";
import { Ui3dGate } from "@/lib/ui-mode/Ui3dGate";

// Footer admin tomonidan tahrirlanadigan sayt sozlamalarini (kontakt,
// ijtimoiy tarmoqlar) jonli o'qiydi, shuning uchun bu layout ostidagi
// sahifalar so'rov paytida render qilinadi (admin o'zgarishlari darhol
// ko'rinadi, build vaqtidagi eski qiymatlar qotib qolmaydi).
export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [locale, settings] = await Promise.all([
    getLocale(),
    // 3D rejim tugmasi ko'rinadimi (admin sozlamasi, standart - yo'q).
    getSiteSettings().catch(() => null),
  ]);
  const show3dMode = settings?.show3dMode === true;

  return (
    <LocaleProvider initialLocale={locale}>
      {/* Do'kon va sayt haqidagi sxema - hamma sahifada. */}
      <JsonLd
        data={organizationJsonLd({
          phone: settings?.phone,
          email: settings?.email,
          address: settings?.address,
          socialUrls: (settings?.socials ?? []).map((item) => item.url).filter(Boolean),
        })}
      />
      {/* 3D DUNYO: butun do'kon ortidagi yagona sahna. Sahifa
          almashganda qayta yaratilmaydi - kamera boshqa "bekat"ga
          uchib boradi (`lib/world/stations.ts`). Klassik rejimda
          umuman chizilmaydi. */}
      {show3dMode && <WorldCanvas />}
      {/* Admin 3D ni o'chirsa, ilgari 3D tanlagan mijoz klassikka qaytadi. */}
      <Ui3dGate enabled={show3dMode} />

      <div className="flex min-h-screen flex-col">
        <Header show3dMode={show3dMode} />
        {/* Suzuvchi pastki panel kontentni yopmasin: uning balandligi +
            chekka bo'shlig'i qadar joy qoldiriladi (faqat telefonda). */}
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <Footer />
        <MobileBottomNav />
        {/* AI yordamchi - kalit sozlangan bo'lsagina ko'rinadi. */}
        <AssistantWidget />
      </div>
    </LocaleProvider>
  );
}
