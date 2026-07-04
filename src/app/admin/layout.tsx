import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { AdminShell } from "@/components/admin/AdminShell";

// /admin/* har doim so'rov vaqtida, joriy foydalanuvchi sessiyasiga
// bog'liq holda render qilinishi kerak - hech qachon build vaqtida
// statik sahifa sifatida keshlanmasligi (yoki prerender qilinmasligi)
// kerak, aks holda eskirgan/xato ma'lumot yoki (bundan ham yomoni)
// build vaqtida haqiqiy Firebase credentiallari mavjud bo'lmasa xato
// butun build jarayonini to'xtatib qo'yishi mumkin.
export const dynamic = "force-dynamic";

// Proxy (src/proxy.ts) allaqachon /admin/* ni himoyalaydi, lekin
// defense-in-depth prinsipiga ko'ra rolni bu yerda server komponentda
// ham mustaqil qayta tekshiramiz.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();

  if (!user || user.role !== "admin") {
    redirect("/");
  }

  return <AdminShell>{children}</AdminShell>;
}
