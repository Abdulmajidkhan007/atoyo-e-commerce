import { TvSettingsForm } from "@/components/admin/TvSettingsForm";

/**
 * DO'KON EKRANI (televizor) sozlamalari.
 *
 * Televizorga ILOVA o'rnatilmaydi: u shunchaki saytdagi `/tv`
 * sahifasini brauzerda ochib turadi, bu yerdagi sozlama esa nima
 * ko'rsatilishini boshqaradi.
 */
export const dynamic = "force-dynamic";

export default function AdminTvPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">
          Do&apos;kon ekrani (televizor)
        </h1>
        <p className="text-sm text-navy-300">
          Do&apos;konga osilgan televizorda mahsulotlar avtomatik aylanib turadi: katta rasm,
          katta narx va QR kod. Televizorga ilova o&apos;rnatish shart emas — brauzerda
          quyidagi manzil ochilsa yetarli.
        </p>
      </div>
      <TvSettingsForm />
    </div>
  );
}
