import { resolveTopicConfig } from "@/lib/telegram/topics";
import { getRequiredChannels } from "@/lib/telegram/required-channels";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { BotSettingsForm } from "@/components/admin/BotSettingsForm";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [topicConfig, requiredChannels, siteSettings] = await Promise.all([
    resolveTopicConfig(),
    getRequiredChannels(),
    getSiteSettings(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Sayt ma&apos;lumotlari</h1>
        <p className="mb-6 text-sm text-navy-300">
          Kontakt ma&apos;lumotlari (telefon, email, do&apos;kon manzili), ijtimoiy tarmoq havolalari va
          &quot;Biz haqimizda&quot; matni. Bular saytning footer va &quot;Biz haqimizda&quot; sahifasida ko&apos;rinadi.
        </p>
        <SiteSettingsForm initialSettings={siteSettings} />
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Bot sozlamalari</h2>
        <p className="mb-6 text-sm text-navy-300">
          Telegram guruhingizdagi forum-topic Thread ID raqamlari va mijoz-bot uchun majburiy
          obuna kanallarini shu yerdan boshqaring.
        </p>
        <BotSettingsForm initialConfig={topicConfig} initialChannels={requiredChannels} />
      </section>
    </div>
  );
}
