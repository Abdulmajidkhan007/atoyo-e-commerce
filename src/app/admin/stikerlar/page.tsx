import { StickerManager } from "@/components/admin/StickerManager";

/**
 * BOT STIKERLARI.
 *
 * Bot ma'lum daqiqalarda (salomlashuv, buyurtma holati, kutish)
 * stiker yuboradi. Shu yerda qaysi stiker qayerda ishlatilishi
 * belgilanadi va yangi stiker yasaladi.
 */
export const dynamic = "force-dynamic";

export default function AdminStickersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Bot stikerlari</h1>
        <p className="text-sm text-navy-300">
          Botdagi muhim daqiqalarda stiker yuboriladi: salomlashuv, buyurtma qabul qilinishi,
          holat o&apos;zgarishi, yordamchi javob tayyorlayotgan payt. Bu yerdan qaysi stiker
          qayerda ishlashini belgilaysiz va yangi stiker yasaysiz.
        </p>
      </div>
      <StickerManager />
    </div>
  );
}
