import { getCurrentAppUser } from "@/lib/firebase/session";
import { isOwner, hasPermission } from "@/lib/permissions";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const viewer = await getCurrentAppUser();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900 dark:text-white">Foydalanuvchilar va rollar</h1>
      <AdminUsersTable viewerIsOwner={isOwner(viewer) || hasPermission(viewer, "roles")} />
    </div>
  );
}
