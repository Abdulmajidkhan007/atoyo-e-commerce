import { WholesalePanel } from "@/components/admin/WholesalePanel";

export const dynamic = "force-dynamic";

export default function AdminWholesalePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Optom mijozlar</h1>
        <p className="text-sm text-navy-300">
          Viloyatlardagi do&apos;konlar. Har biriga maxfiy kalit yaratiladi va Telegram/SMS/email
          orqali yuboriladi. Mijoz kalitni <code>/optom</code> sahifasida kiritsa, hisobi optomga
          o&apos;tadi va katalogda <b>optom narxlarni</b> ko&apos;radi. Dona mijozlar optom narxni
          ko&apos;rmaydi.
        </p>
      </div>
      <WholesalePanel />
    </div>
  );
}
