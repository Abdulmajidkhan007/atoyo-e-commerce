"use client";

import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import { useDelivery } from "@/lib/delivery/useDelivery";
import { freeDeliveryText, installServiceText } from "@/lib/delivery/text";

/**
 * YETKAZIB BERISH VA'DASI — kichik eslatma bloki.
 *
 * Savat/checkout, kontakt va shunga o'xshash joylarda ishlatiladi.
 * Matn sozlamadan keladi; `withInstall` bo'lsa o'rnatib berish
 * xizmati haqida ham yoziladi (xizmat o'chirilgan bo'lsa - chiqmaydi).
 */
export function DeliveryNote({
  withInstall = true,
  className = "",
}: {
  withInstall?: boolean;
  className?: string;
}) {
  const delivery = useDelivery();
  const install = withInstall ? installServiceText(delivery) : null;

  return (
    <div
      className={`rounded-xl2 border border-aqua-500/30 bg-aqua-50/60 p-3 text-sm text-navy-600 dark:border-aqua-500/30 dark:bg-navy-800 dark:text-navy-100 ${className}`}
    >
      <p className="flex items-start gap-2">
        <LocalShippingOutlinedIcon fontSize="small" className="mt-0.5 shrink-0 text-aqua-600" />
        <span>{freeDeliveryText(delivery)}</span>
      </p>
      {install && (
        <p className="mt-2 flex items-start gap-2">
          <HandymanOutlinedIcon fontSize="small" className="mt-0.5 shrink-0 text-aqua-600" />
          <span>{install}</span>
        </p>
      )}
    </div>
  );
}
