import { resolveTopicConfig } from "@/lib/telegram/topics";
import { describeTelegramSecrets } from "@/lib/telegram/secrets";
import { getCurrentAppUser } from "@/lib/firebase/session";
import { isOwner } from "@/lib/permissions";
import { resolveChannelId } from "@/lib/telegram/channel";
import { getRequiredChannels } from "@/lib/telegram/required-channels";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { BotSettingsForm } from "@/components/admin/BotSettingsForm";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import { PricingSettingsForm } from "@/components/admin/PricingSettingsForm";
import { ChannelFooterForm } from "@/components/admin/ChannelFooterForm";
import { SecretsForm } from "@/components/admin/SecretsForm";
import { SocialSettingsForm } from "@/components/admin/SocialSettingsForm";
import { EmailSettingsForm } from "@/components/admin/EmailSettingsForm";
import { DiagnosticsPanel } from "@/components/admin/DiagnosticsPanel";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [topicConfig, requiredChannels, siteSettings, channelId, user] = await Promise.all([
    resolveTopicConfig(),
    getRequiredChannels(),
    getSiteSettings(),
    resolveChannelId(),
    getCurrentAppUser(),
  ]);

  // Maxfiy kalitlar faqat loyiha egasiga - niqoblangan ko'rinishda.
  const secrets = isOwner(user) ? await describeTelegramSecrets() : null;

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
        <h2 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Narx va buyurtma</h2>
        <p className="mb-6 text-sm text-navy-300">
          Optom narxdan dona narx qanday hisoblanishi va buyurtmaning eng kam summasi.
        </p>
        <PricingSettingsForm />
      </section>

      {isOwner(user) && (
        <section>
          <h2 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Email (SMTP)</h2>
          <p className="mb-6 text-sm text-navy-300">
            Buyurtma holati, e&apos;lonlar va parol tiklash xatlari shu pochta orqali ketadi.
            Sozlanmagan bo&apos;lsa email umuman yuborilmaydi (Telegram va SMS ishlayveradi).
          </p>
          <EmailSettingsForm />
        </section>
      )}

      <section>
        <h2 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Ijtimoiy tarmoqlar</h2>
        <p className="mb-6 text-sm text-navy-300">
          Instagram, Facebook va YouTube. Yoqilgan tarmoqqa yangi mahsulot va kirim
          Telegram kanali bilan bir qatorda post bo&apos;ladi — kunlik chegara va navbat bilan.
          Ommaviy kirimda (o&apos;nlab mahsulot) post ketmaydi.
        </p>
        <SocialSettingsForm owner={isOwner(user)} />
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

      <section>
        <h2 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Tizim tekshiruvi</h2>
        <p className="mb-6 text-sm text-navy-300">
          Bildirishnoma kelmayaptimi, Telegram orqali kirish ishlamayaptimi? Shu yerdan har bir
          bo&apos;g&apos;inni sinab ko&apos;ring — xato matni bilan ko&apos;rsatiladi.
        </p>
        <DiagnosticsPanel />
      </section>

      {/* Maxfiy kalitlar - faqat loyiha egasiga ko'rinadi. */}
      {secrets && (
        <section>
          <h2 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Maxfiy kalitlar</h2>
          <p className="mb-6 text-sm text-navy-300">
            Bot tokeni, xodimlar guruhi ID si va webhook siri. Bu yerdagi qiymat hosting
            sozlamalaridagi (env) qiymatdan <b>ustun turadi</b> — kalitni almashtirish uchun
            qayta deploy qilish shart emas. Qiymatlar hech qachon to&apos;liq ko&apos;rsatilmaydi.
          </p>
          <SecretsForm initial={secrets} />
        </section>
      )}
    </div>
  );
}
