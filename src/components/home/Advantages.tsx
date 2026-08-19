"use client";

import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { useDelivery } from "@/lib/delivery/useDelivery";
import { freeDeliveryText, installServiceText } from "@/lib/delivery/text";
import { GlassCard } from "@/components/motion/GlassCard";

/**
 * BIZNING USTUNLIGIMIZ.
 *
 * Bosh sahifada va "Biz haqimizda" sahifasida bir xil bo'lim.
 * Yetkazib berish va o'rnatish matni SOZLAMADAN keladi
 * (`settings/delivery`) - admin uni saytdagi hamma joyda bir vaqtda
 * o'zgartira oladi. Sozlama o'qilmasa standart matn ko'rinadi.
 */
export function Advantages({ compact = false }: { compact?: boolean }) {
  const { dict } = useI18n();
  const delivery = useDelivery();
  const install = installServiceText(delivery);

  const cards = [
    {
      Icon: LocalShippingOutlinedIcon,
      title: dict.advantages.deliveryTitle,
      text: freeDeliveryText(delivery),
    },
    ...(install
      ? [{ Icon: HandymanOutlinedIcon, title: dict.advantages.installTitle, text: install }]
      : []),
    {
      Icon: VerifiedOutlinedIcon,
      title: dict.advantages.qualityTitle,
      text: dict.advantages.qualityText,
    },
    {
      Icon: SupportAgentOutlinedIcon,
      title: dict.advantages.supportTitle,
      text: dict.advantages.supportText,
    },
  ];

  return (
    <section className={compact ? "" : "mx-auto max-w-7xl px-4 pb-4"}>
      {!compact && (
        <h2 className="mb-4 text-xl font-bold text-navy-900 dark:text-white">
          {dict.advantages.title}
        </h2>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ Icon, title, text }) => (
          // GlassCard rejimga qarab o'zi tanlaydi: klassik kartochka
          // yoki shishasimon (blur) variant + mayin hover.
          <GlassCard key={title} className="!p-5">
            <Icon className="text-aqua-500" fontSize="large" />
            <p className="mt-3 font-semibold text-navy-900 dark:text-white">{title}</p>
            <p className="mt-1 text-sm text-navy-500 dark:text-navy-100">{text}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
