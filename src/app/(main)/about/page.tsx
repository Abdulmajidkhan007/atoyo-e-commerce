import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/firebase/admin-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Biz haqimizda | Atoyo Santexnika",
};

export default async function AboutPage() {
  const settings = await getSiteSettings();

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold text-navy-900 dark:text-white">{settings.about.title}</h1>
      <div className="whitespace-pre-line text-navy-500 dark:text-navy-100">{settings.about.body}</div>

      <div className="mt-10 rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
        <h2 className="mb-3 font-semibold text-navy-900 dark:text-white">Bog&apos;lanish</h2>
        <p className="text-sm text-navy-500 dark:text-navy-100">📞 {settings.phone}</p>
        <p className="text-sm text-navy-500 dark:text-navy-100">✉️ {settings.email}</p>
        <p className="text-sm text-navy-500 dark:text-navy-100">📍 {settings.address}</p>
        <div className="mt-3 flex gap-3">
          {settings.socials
            .filter((s) => s.url)
            .map((s) => (
              <a key={s.platform} href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm capitalize text-aqua-600 hover:underline dark:text-aqua-300">
                {s.platform}
              </a>
            ))}
        </div>
      </div>
    </section>
  );
}
