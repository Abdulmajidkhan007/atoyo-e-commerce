import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

// Footer admin tomonidan tahrirlanadigan sayt sozlamalarini (kontakt,
// ijtimoiy tarmoqlar) jonli o'qiydi, shuning uchun bu layout ostidagi
// sahifalar so'rov paytida render qilinadi (admin o'zgarishlari darhol
// ko'rinadi, build vaqtidagi eski qiymatlar qotib qolmaydi).
export const dynamic = "force-dynamic";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
