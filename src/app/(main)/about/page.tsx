import Image from "next/image";
import type { Metadata } from "next";
import LocalPhoneOutlinedIcon from "@mui/icons-material/LocalPhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { getServerDictionary } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return { title: t.about.metaTitle };
}

export default async function AboutPage() {
  const t = await getServerDictionary();
  const settings = await getSiteSettings();
  const socials = settings.socials.filter((s) => s.url);

  const features = [
    { Icon: VerifiedOutlinedIcon, title: t.about.features.qualityTitle, text: t.about.features.qualityText },
    { Icon: LocalShippingOutlinedIcon, title: t.about.features.deliveryTitle, text: t.about.features.deliveryText },
    { Icon: SupportAgentOutlinedIcon, title: t.about.features.supportTitle, text: t.about.features.supportText },
  ];

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
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

      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {features.map(({ Icon, title, text }) => (
          <div key={title} className="rounded-xl2 border border-navy-100 bg-white p-5 dark:border-navy-500 dark:bg-navy-700">
            <Icon className="text-aqua-500" fontSize="large" />
            <p className="mt-3 font-semibold text-navy-900 dark:text-white">{title}</p>
            <p className="mt-1 text-sm text-navy-500 dark:text-navy-100">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl2 border border-navy-100 bg-white p-6 dark:border-navy-500 dark:bg-navy-700">
        <h2 className="mb-4 text-lg font-semibold text-navy-900 dark:text-white">{t.about.contactTitle}</h2>
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
