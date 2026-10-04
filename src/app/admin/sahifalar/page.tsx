import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { hasPermission } from "@/lib/permissions";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { FaqEditor } from "@/components/admin/FaqEditor";
import { TestimonialsManager } from "@/components/admin/TestimonialsManager";

export const dynamic = "force-dynamic";

/**
 * SAHIFALAR: "Savol-javob" matni, bosh sahifadagi "Mijozlar fikri" va
 * "Yetkazib berish" sahifasi qayerdan olinishi.
 */
export default async function AdminPagesPage() {
  const user = await getCurrentAppUser();
  if (!hasPermission(user, "settings")) redirect("/admin");
  const settings = await getSiteSettings();

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Savol-javob</h1>
        <p className="mb-6 text-sm text-navy-300">
          Saytdagi{" "}
          <a href="/savol-javob" target="_blank" rel="noreferrer" className="text-aqua-600 underline">
            /savol-javob
          </a>{" "}
          sahifasi. Google bu savollarni qidiruv natijasida ochiladigan ro&apos;yxat qilib ko&apos;rsatishi
          mumkin — shuning uchun faqat HAQIQIY shartlarni yozing.
        </p>
        <FaqEditor />
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Mijozlar fikri</h2>
        <p className="mb-6 text-sm text-navy-300">
          Mijozlar mahsulot sahifasida qoldirgan sharhlardan bosh sahifaga chiqadiganlarini tanlang.
        </p>
        <TestimonialsManager initialShow={settings.showTestimonials !== false} />
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Yetkazib berish sahifasi</h2>
        <p className="text-sm text-navy-300">
          <a href="/yetkazib-berish" target="_blank" rel="noreferrer" className="text-aqua-600 underline">
            /yetkazib-berish
          </a>{" "}
          sahifasidagi narx, hududlar va o&apos;rnatish matni{" "}
          <Link href="/admin/promokod" className="text-aqua-600 underline">
            Promokod → Yetkazib berish
          </Link>{" "}
          sozlamasidan avtomatik olinadi; qo&apos;shimcha matn ham o&apos;sha yerda. To&apos;lov usullari —
          Sozlamalar → Kartaga o&apos;tkazma.
        </p>
      </section>
    </div>
  );
}
