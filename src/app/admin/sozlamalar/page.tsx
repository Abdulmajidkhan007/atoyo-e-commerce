import { resolveTopicConfig } from "@/lib/telegram/topics";
import { resolveChannelId } from "@/lib/telegram/channel";
import { getRequiredChannels } from "@/lib/telegram/required-channels";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { BotSettingsForm } from "@/components/admin/BotSettingsForm";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import { ChannelFooterForm } from "@/components/admin/ChannelFooterForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [topicConfig, requiredChannels, siteSettings, channelId] = await Promise.all([
    resolveTopicConfig(),
    getRequiredChannels(),
    getSiteSettings(),
    resolveChannelId(),
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
        <h2 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Kanal posti footeri</h2>
        <p className="mb-6 text-sm text-navy-300">
          Kanaldagi har bir mahsulot e&apos;lonining oxirida chiqadigan qism: telefon raqamlar,
          do&apos;kon shiori, manzil va havolalar (Telegram, Instagram, YouTube, operator, sayt).
          Tartibi: mahsulot ma&apos;lumoti → telefon → shior → manzil → havolalar.
        </p>
        <ChannelFooterForm
          initial={
            siteSettings.channelFooter ?? { phones: [], slogan: "", address: "", links: [] }
          }
        />
      </section>

      <section>
        <h2 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Bot sozlamalari</h2>
        <p className="mb-6 text-sm text-navy-300">
          Telegram guruhingizdagi forum-topic Thread ID raqamlari va mijoz-bot uchun majburiy
          obuna kanallarini shu yerdan boshqaring.
        </p>
        <BotSettingsForm
          initialConfig={topicConfig}
          initialChannels={requiredChannels}
          initialChannelId={channelId ?? ""}
        />
      </section>

    </div>
  );
}
