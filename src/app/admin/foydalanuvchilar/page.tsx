import { AdminUsersTable } from "@/components/admin/AdminUsersTable";

export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900 dark:text-white">Foydalanuvchilar va rollar</h1>
      <AdminUsersTable />
    </div>
  );
}
