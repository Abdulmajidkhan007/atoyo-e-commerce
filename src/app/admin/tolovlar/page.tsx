import { ExpensesPanel } from "@/components/admin/ExpensesPanel";

export const dynamic = "force-dynamic";

export default function AdminExpensesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">To&apos;lovlar</h1>
        <p className="text-sm text-navy-300">
          Loyihani ushlab turish xarajatlari: Firebase, AI kalitlari, domen, SMS. Muddati
          yaqinlashganda xodimlar guruhiga eslatma tushadi. To&apos;lovning o&apos;zi tegishli
          xizmat sahifasida amalga oshiriladi &mdash; bu yerda muddat, summa va tarix yuritiladi.
        </p>
      </div>
      <ExpensesPanel />
    </div>
  );
}
