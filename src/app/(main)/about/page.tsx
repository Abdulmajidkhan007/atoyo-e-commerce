import Image from "next/image";
import type { Metadata } from "next";
import LocalPhoneOutlinedIcon from "@mui/icons-material/LocalPhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Advantages } from "@/components/home/Advantages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Biz haqimizda | Atoyo Santexnika",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const socials = settings.socials.filter((s) => s.url);

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <Breadcrumbs items={[{ name: settings.about.title }]} />
      <h1 className="text-3xl font-bold text-navy-900 dark:text-white sm:text-4xl">{settings.about.title}</h1>

      <div className="mt-8 grid gap-8 md:grid-cols-2 md:items-start">
        <div className="whitespace-pre-line leading-relaxed text-navy-500 dark:text-navy-100">
          {settings.about.body}
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-xl2 border border-navy-100 bg-navy-50 dark:border-navy-500 dark:bg-navy-900">
          {settings.about.imageUrl ? (
            <Image
              src={settings.about.imageUrl}
              alt={settings.about.title}
              fill
              sizes="(max-width:768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl">🏪</div>
          )}
        </div>
      </div>

      {/* Ustunliklar bosh sahifadagi bilan BIR XIL bo'lim -
          yetkazib berish va o'rnatish matni sozlamadan keladi,
          shuning uchun ikki joyda ikki xil yozilib qolmaydi. */}
      <div className="mt-12">
        <Advantages />
      </div>

      <div className="mt-12 rounded-xl2 border border-navy-100 bg-white p-6 dark:border-navy-500 dark:bg-navy-700">
        <h2 className="mb-4 text-lg font-semibold text-navy-900 dark:text-white">Bog&apos;lanish</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <a href={`tel:${settings.phone}`} className="flex items-center gap-3 text-navy-500 hover:text-aqua-600 dark:text-navy-100 dark:hover:text-aqua-300">
            <LocalPhoneOutlinedIcon className="text-aqua-500" />
            <span className="text-sm">{settings.phone}</span>
          </a>
          <a href={`mailto:${settings.email}`} className="flex items-center gap-3 text-navy-500 hover:text-aqua-600 dark:text-navy-100 dark:hover:text-aqua-300">
            <EmailOutlinedIcon className="text-aqua-500" />
            <span className="break-all text-sm">{settings.email}</span>
          </a>
          <div className="flex items-center gap-3 text-navy-500 dark:text-navy-100">
            <PlaceOutlinedIcon className="text-aqua-500" />
            <span className="text-sm">{settings.address}</span>
          </div>
        </div>

        {socials.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-3 border-t border-navy-100 pt-4 dark:border-navy-500">
            {socials.map((s) => (
              <a
                key={s.platform}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-aqua-500/40 px-4 py-1.5 text-sm capitalize text-aqua-600 transition hover:bg-aqua-500/10 dark:text-aqua-300"
              >
                {s.platform}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
