import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { hasPermission } from "@/lib/permissions";
import { getDeliverySettings } from "@/lib/orders/pricing";
import { getAdminDb } from "@/lib/firebase/admin";
import { PromoManager } from "@/components/admin/PromoManager";
import type { PromoCode } from "@/types/promo";

export const dynamic = "force-dynamic";

/** Promokodlar va yetkazib berish narxi - "settings" huquqi bilan. */
export default async function AdminPromoPage() {
  const user = await getCurrentAppUser();
  if (!hasPermission(user, "settings")) redirect("/admin");

  const [snap, delivery] = await Promise.all([
    getAdminDb().collection("promoCodes").limit(200).get(),
    getDeliverySettings(),
  ]);
  const promos = snap.docs
    .map((d) => ({ ...d.data(), code: d.id }) as PromoCode)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Promokod va yetkazib berish</h1>
      <PromoManager initialPromos={promos} initialDelivery={delivery} />
    </div>
  );
}
