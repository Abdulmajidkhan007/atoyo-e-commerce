"use client";

import { useImmersive } from "@/lib/ui-mode/useImmersive";
import { FaucetConfigurator } from "@/components/3d/FaucetConfigurator";

/**
 * MAHSULOT SAHIFASIDAGI 3D KO'RINISH.
 *
 * Faqat 3D rejimda va qurilma ko'tarsa chiziladi - klassik rejimda
 * bu blok umuman qurilmaydi (og'ir kutubxonalar ham yuklanmaydi).
 *
 * HALOLLIK: model KATEGORIYA bo'yicha namunaviy, ya'ni aynan shu
 * mahsulotning nusxasi emas (katalogda 10 000+ mahsulot bor, har
 * biriga alohida model yasab bo'lmaydi). Shuning uchun ostiga shu
 * haqda ochiq yozuv qo'yilgan - mijoz rasm bilan modelni chalkash-
 * tirmasligi kerak. Mahsulotga haqiqiy `.glb` biriktirilsa,
 * konfigurator avval o'shani ko'rsatadi.
 */
export function Product3dView({
  category,
  modelUrl,
  className = "",
}: {
  category: string;
  modelUrl?: string;
  className?: string;
}) {
  const { immersive } = useImmersive();
  if (!immersive) return null;

  return (
    <section className={`mt-10 ${className}`}>
      <h2 className="mb-3 text-lg font-semibold text-navy-900 dark:text-white">
        3D ko&apos;rinish va qoplama
      </h2>
      <FaucetConfigurator category={category} modelUrl={modelUrl} />
      <p className="mt-2 text-xs text-navy-300">
        Model shu turdagi mahsulot uchun namunaviy — qoplamani tanlab, shakl va yorug&apos;likni
        360° aylantirib ko&apos;rishingiz mumkin. Mahsulotning aniq ko&apos;rinishi yuqoridagi
        rasmlarda.
      </p>
    </section>
  );
}
