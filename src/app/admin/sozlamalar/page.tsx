import { resolveTopicConfig } from "@/lib/telegram/topics";
import { getRequiredChannels } from "@/lib/telegram/required-channels";
import { BotSettingsForm } from "@/components/admin/BotSettingsForm";

export default async function AdminSettingsPage() {
  const [topicConfig, requiredChannels] = await Promise.all([
    resolveTopicConfig(),
    getRequiredChannels(),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Bot sozlamalari</h1>
      <p className="mb-6 text-sm text-navy-300">
        Telegram guruhingizdagi forum-topic Thread ID raqamlari va mijoz-bot uchun majburiy
        obuna kanallarini shu yerdan boshqaring.
      </p>
      <BotSettingsForm initialConfig={topicConfig} initialChannels={requiredChannels} />
    </div>
  );
}
