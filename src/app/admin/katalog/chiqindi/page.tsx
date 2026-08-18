import { TrashPanel } from "@/components/admin/TrashPanel";
import { TRASH_DAYS } from "@/lib/products/trash";

export const dynamic = "force-dynamic";

/**
 * O'CHIRILGANLAR SAVATI: o'chirilgan mahsulot darhol yo'q bo'lmaydi,
 * shu yerda 30 kun turadi va bir bosishda tiklanadi.
 */
export default function TrashPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">
          O&apos;chirilgan mahsulotlar
        </h1>
        <p className="text-sm text-navy-300">
          O&apos;chirilgan mahsulot shu yerda <b>{TRASH_DAYS} kun</b> saqlanadi — rasmlari,
          narxi va kodi bilan birga. Xato o&apos;chirilgan bo&apos;lsa bir bosishda
          tiklanadi (saytda yopiq holda qaytadi, keyin &laquo;Saytda ochish&raquo; bilan
          ochasiz). Muddat tugagach avtomatik butunlay o&apos;chadi.
        </p>
      </div>

      <TrashPanel />
    </div>
  );
}
