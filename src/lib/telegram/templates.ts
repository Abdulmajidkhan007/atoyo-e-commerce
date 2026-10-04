import "server-only";
import type { Order, OrderStatus } from "@/types/order";
import { formatSom } from "@/lib/format";
import { escapeHtml } from "./html";

const STATUS_LABELS: Record<OrderStatus, string> = {
  // "Kutilmoqda" ilgari to'lov qatoridagi "to'lov kutilmoqda" bilan
  // aralashib ketardi - admin nimani kutayotganini tushunmasdi.
  pending: "🆕 Yangi — hali qabul qilinmagan",
  approved: "✅ Qabul qilindi",
  delivering: "🚚 Yetkazilmoqda",
  completed: "🎉 Yakunlandi",
  cancelled: "❌ Bekor qilindi",
};

const PAYMENT_LABELS: Record<Order["paymentMethod"], string> = {
  cash: "💵 Naqd (yetkazilganda)",
  online: "💳 Onlayn (karta)",
  transfer: "🏦 Kartaga o'tkazma",
};

const PAYMENT_STATUS_LABELS: Record<Order["paymentStatus"], string> = {
  not_required: "",
  pending: " — ⏳ to'lov kutilmoqda",
  paid: " — ✅ to'landi",
  failed: " — ❌ to'lov amalga oshmadi",
};

export function formatOrderMessage(order: Order): string {
  const itemsList = order.items
    .map((item) => `• ${escapeHtml(item.name)} — ${item.quantity} x ${formatSom(item.price)}`)
    .join("\n");

  const lines = [
    `🛒 <b>Yangi buyurtma #${order.id.slice(0, 8)}</b>`,
    ``,
    `👤 <b>Xaridor:</b> ${escapeHtml(order.customerName)}`,
    `📞 <b>Telefon:</b> ${escapeHtml(order.phoneNumber)}`,
  ];

  if (order.customerEmail) {
    lines.push(`📧 <b>Email:</b> ${escapeHtml(order.customerEmail)}`);
  }

  // Manzil: lokatsiya bo'lsa xarita havolasi, bo'lmasa qo'lda yozilgan manzil.
  if (order.location) {
    lines.push(
      `📍 <a href="https://maps.google.com/?q=${order.location.latitude},${order.location.longitude}">Xaritada ko'rish</a>`
    );
  }
  if (order.deliveryAddress) {
    lines.push(`🏠 <b>Manzil:</b> ${escapeHtml(order.deliveryAddress)}`);
  }
  if (!order.location && !order.deliveryAddress) {
    lines.push(`📍 Manzil ko'rsatilmagan`);
  }

  lines.push(``, `📦 <b>Mahsulotlar:</b>`, itemsList, ``);

  // Chegirma/yetkazish bo'lsa - hisob-kitob ochiq ko'rsatiladi.
  if (order.discountAmount || order.deliveryFee) {
    lines.push(`🧾 <b>Mahsulotlar summasi:</b> ${formatSom(order.subtotal ?? order.totalAmount)}`);
    if (order.discountAmount) {
      lines.push(
        `🏷 <b>Chegirma${order.promoCode ? ` (${escapeHtml(order.promoCode)})` : ""}:</b> −${formatSom(order.discountAmount)}`
      );
    }
    if (order.deliveryFee) {
      lines.push(`🚚 <b>Yetkazib berish:</b> ${formatSom(order.deliveryFee)}`);
    }
  }

  lines.push(`💰 <b>Jami:</b> ${formatSom(order.totalAmount)}`);

  // KARTAGA O'TKAZMA, hali tasdiqlanmagan: admin NIMA QILISHI kerakligi
  // ochiq yoziladi. Ilgari "⏳ to'lov kutilmoqda" + "Chek yuklangan —
  // tekshiring" + "Holat: Kutilmoqda" birga turardi va egasi xabarni
  // "tushunarsiz" dedi: chek keldimi, pul keldimi, nimani bosish kerak?
  if (order.paymentMethod === "transfer" && order.paymentStatus === "pending") {
    lines.push(`💳 <b>To'lov:</b> ${PAYMENT_LABELS.transfer}`);
    if (order.receipt) {
      lines.push(
        `🧾 Mijoz chek yubordi (pastdagi alohida xabarda).`,
        `👉 Kartangizga <b>${formatSom(order.totalAmount)}</b> tushganini bank ilovasida tekshiring, so'ng chek ostidagi «✅ To'lov keldi» ni bosing.`
      );
    } else {
      lines.push(`⏳ Mijoz hali chek yubormagan — pul o'tkazilmagan bo'lishi mumkin.`);
    }
  } else {
    lines.push(
      `💳 <b>To'lov:</b> ${PAYMENT_LABELS[order.paymentMethod]}${PAYMENT_STATUS_LABELS[order.paymentStatus]}`
    );
  }
  if (order.guest) {
    lines.push(`👤 Ro'yxatdan o'tmagan (1 klikda) — tasdiqlash uchun qo'ng'iroq qiling`);
  }
  lines.push(``, `Holat: ${STATUS_LABELS[order.status]}`);

  return lines.join("\n");
}

export function formatContactMessage(params: { name: string; phone: string; question: string }): string {
  return [
    `📩 <b>Yangi bog'lanish so'rovi</b>`,
    ``,
    `👤 <b>Ism:</b> ${escapeHtml(params.name)}`,
    `📞 <b>Telefon:</b> ${escapeHtml(params.phone)}`,
    `❓ <b>Savol:</b> ${escapeHtml(params.question)}`,
  ].join("\n");
}

export function formatSubscriberMessage(email: string): string {
  return `📬 <b>Yangi obunachi</b>\n\n✉️ ${escapeHtml(email)}`;
}
