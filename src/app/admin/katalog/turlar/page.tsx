import { TaxonomyManager } from "@/components/admin/TaxonomyManager";

export const dynamic = "force-dynamic";

export default function TaxonomyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">
          Kategoriya, material, sotish turi, brend va davlat
        </h1>
        <p className="text-sm text-navy-300">
          Bu yerda qo&apos;shilgan ro&apos;yxatlar darhol hamma joyda ishlaydi: mahsulot formasi,
          saytdagi filtr, Telegram &quot;Kirim&quot; topic&apos;i va mijoz-bot. Brend va ishlab
          chiqarilgan davlat mahsulot formasida ro&apos;yxatdan tanlanadi — qo&apos;lda yozilmaydi,
          shuning uchun bir nom turlicha yozilib ketmaydi.
        </p>
      </div>

      <TaxonomyManager />
    </div>
  );
}
