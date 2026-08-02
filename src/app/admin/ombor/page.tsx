import { InventoryPanel } from "@/components/admin/InventoryPanel";

export const dynamic = "force-dynamic";

export default function AdminInventoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Ombor</h1>
        <p className="text-sm text-navy-300">
          Zaxira har safar o&apos;zgarganda shu yerga yozuv tushadi: kirim, sotuv, qaytish,
          chiqim va sanoq. Shu tarix bo&apos;yicha &laquo;mahsulot qayerga ketdi&raquo; degan
          savolga javob topiladi.
        </p>
      </div>
      <InventoryPanel />
    </div>
  );
}
