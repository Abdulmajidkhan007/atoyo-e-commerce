import { Admin3dPreview } from "@/components/admin/Admin3dPreview";

/**
 * 3D KO'RINISH (SINOV).
 *
 * Mijozga 3D rejim standart holda ko'rinmaydi — u Sozlamalardagi
 * tugma bilan yoqiladi. Shu sahifa esa 3D ni MIJOZGA CHIQARMASDAN
 * baholash uchun: modellar kategoriya bo'yicha namunaviy, qoplama
 * (xrom / tillarang / mat qora) almashtiriladi, model barmoq bilan
 * aylantiriladi.
 */
export const dynamic = "force-dynamic";

export default function Admin3dPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">
          3D ko&apos;rinish (sinov)
        </h1>
        <p className="max-w-3xl text-sm text-navy-300">
          Bu yerdagi modellar KATEGORIYA bo&apos;yicha namunaviy — har bir mahsulotga alohida
          3D model yasab bo&apos;lmaydi (katalogda 10 000+ mahsulot). Modelni barmoq bilan
          aylantirib, qoplamasini almashtirib ko&apos;ring. Sizga ma&apos;qul kelsa,
          <strong className="text-navy-900 dark:text-white"> Sozlamalar → Sayt ko&apos;rinishi </strong>
          dan &quot;3D rejim tugmasi mijozlarga ko&apos;rinsin&quot; ni yoqing — shundagina
          saytda &quot;Klassik / 3D&quot; almashtirgichi paydo bo&apos;ladi. O&apos;chiq
          bo&apos;lsa mijozlar faqat klassik ko&apos;rinishni ko&apos;radi va og&apos;ir 3D
          kutubxonalari umuman yuklanmaydi.
        </p>
      </div>
      <Admin3dPreview />
    </div>
  );
}
