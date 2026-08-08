import type { Metadata } from "next";
import { WholesaleActivation } from "@/components/wholesale/WholesaleActivation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Optom kirish",
  description:
    "Atoyo Santexnika optom mijozlari uchun kirish. Telefon raqam va kalitni kiriting — optom narxlar ochiladi.",
  alternates: { canonical: "/optom" },
  robots: { index: false, follow: false },
};

export default function WholesalePage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-10">
      <Breadcrumbs items={[{ name: "Optom mijoz kirishi" }]} />
      <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Optom mijoz kirishi</h1>
      <p className="mb-6 text-sm text-navy-300">
        Do&apos;koningizga berilgan <b>kalit</b> va telefon raqamni kiriting. Shundan keyin saytda
        va ilovada optom narxlarni ko&apos;rasiz. Kalit bo&apos;lmasa operator bilan
        bog&apos;laning.
      </p>
      <WholesaleActivation />
    </section>
  );
}
