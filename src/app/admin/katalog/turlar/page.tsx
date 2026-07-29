import { TaxonomyManager } from "@/components/admin/TaxonomyManager";

export const dynamic = "force-dynamic";

export default function TaxonomyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">
          Kategoriya, material va sotish turlari
        </h1>
        <p className="text-sm text-navy-300">
          Bu yerda qo&apos;shilgan turlar darhol hamma joyda ishlaydi: mahsulot formasi, saytdagi
          filtr, Telegram &quot;Kirim&quot; topic&apos;i va mijoz-bot.
        </p>
      </div>

      <TaxonomyManager />
    </div>
  );
}
