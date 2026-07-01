import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";

export default function AdminOrdersPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900 dark:text-white">Buyurtmalar nazorati</h1>
      <AdminOrdersTable />
    </div>
  );
}
