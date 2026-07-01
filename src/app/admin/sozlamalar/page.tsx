import { resolveTopicConfig } from "@/lib/telegram/topics";
import { BotSettingsForm } from "@/components/admin/BotSettingsForm";

export default async function AdminSettingsPage() {
  const topicConfig = await resolveTopicConfig();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Bot sozlamalari</h1>
      <p className="mb-6 text-sm text-navy-300">
        Telegram guruhingizdagi forum-topic (mavzu) lar uchun Thread ID raqamlarini shu yerdan boshqaring.
      </p>
      <BotSettingsForm initialConfig={topicConfig} />
    </div>
  );
}
