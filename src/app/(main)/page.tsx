import { Advantages } from "@/components/home/Advantages";
import { Hero } from "@/components/home/Hero";
import { HomeCategories } from "@/components/home/HomeCategories";
import { ShowcaseGrid } from "@/components/home/ShowcaseGrid";
import { Reveal } from "@/components/motion/Reveal";
import { getDictionary } from "@/lib/i18n/server";
import { loadShowcaseForViewer } from "@/lib/products/storefront";

/**
 * BOSH SAHIFA — endi SERVER komponent.
 *
 * Ilgari butun sahifa client edi: "Yangi mahsulotlar" sarlavhasi
 * HTMLda bor, mahsulotlar esa yo'q edi — Google va sekin internetdagi
 * mijoz bo'sh do'kon ko'rardi. Endi namuna ro'yxati HTML bilan birga
 * keladi (`loadShowcaseForViewer`, narx `toViewerProducts` dan o'tgan).
 *
 * Interaktiv qismlar client bo'lib qoladi: Hero (3D/animatsiya) va
 * kategoriyalar to'ri (`/api/taxonomy` dan jonli o'qiydi).
 */
export default async function HomePage() {
  const [dict, showcase] = await Promise.all([getDictionary(), loadShowcaseForViewer()]);

  return (
    <>
      {/* Hero: 3D rejimda orqa fonda interaktiv sahna, klassikda -
          hozirgi tekis fon. Matn ikkalasida bir xil. */}
      <Hero />

      <HomeCategories title={dict.home.categories} />

      {/* Bizning ustunligimiz: bepul yetkazish + o'rnatib berish
          xizmati (matn sozlamadan keladi). */}
      <Reveal delay={0.05}>
        <Advantages />
      </Reveal>

      <Reveal as="section" delay={0.05} className="mx-auto max-w-7xl px-4 pb-16 pt-6">
        <h2 className="mb-4 text-xl font-bold text-navy-900 dark:text-white">
          {dict.home.newProducts}
        </h2>
        <ShowcaseGrid initialProducts={showcase} />
      </Reveal>
    </>
  );
}
