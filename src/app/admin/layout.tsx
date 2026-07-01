import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/firebase/session";

// Middleware allaqachon /admin/* ni himoyalaydi, lekin defense-in-depth
// prinsipiga ko'ra rolni bu yerda server komponentda ham qayta tekshiramiz.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();

  if (!user || user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-navy-100 bg-navy-900 text-white">
        {/* Admin sidebar navigatsiyasi keyingi UI bosqichida */}
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
