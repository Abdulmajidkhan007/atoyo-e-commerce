import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { isStaff } from "@/lib/permissions";
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
// ham mustaqil qayta tekshiramiz. Owner ham, admin ham kira oladi;
// har bir bo'lim ichida aniq huquq (permissions) tekshiriladi.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();

  if (!isStaff(user)) {
    // Sabab ikki xil: umuman kirmagan (cookie eskirgan) yoki kirgan,
    // lekin admin emas. Ikkalasida ham bosh sahifaga jimgina tashlash
    // chalg'itadi - kirish sahifasi sababni yozadi va kerak bo'lsa
    // boshqa hisob bilan kirish taklif qiladi.
    const path = (await headers()).get("x-invoked-path") || "/admin";
    const next = path.startsWith("/admin") ? path : "/admin";
    redirect(`/kirish?redirect=${encodeURIComponent(next)}&reason=${user ? "forbidden" : "login"}`);
  }

  return <AdminShell permissions={user?.permissions} isOwner={user?.role === "owner"}>{children}</AdminShell>;
}
