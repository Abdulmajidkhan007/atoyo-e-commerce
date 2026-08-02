import { ReportsPanel } from "@/components/admin/ReportsPanel";

export const dynamic = "force-dynamic";

export default function AdminReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Hisobot</h1>
        <p className="text-sm text-navy-300">
          Tanlangan davr bo&apos;yicha tushum, foyda, buyurtmalar soni va o&apos;rtacha chek.
          Foyda &laquo;sotuv narxi − tannarx&raquo; bo&apos;yicha hisoblanadi, shuning uchun
          mahsulotlarga tannarx kiritilgan bo&apos;lishi kerak. Bekor qilingan buyurtmalar
          hisobga olinmaydi.
        </p>
      </div>
      <ReportsPanel />
    </div>
  );
}
