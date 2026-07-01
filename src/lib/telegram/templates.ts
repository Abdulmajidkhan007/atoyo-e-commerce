import "server-only";
import type { Order, OrderStatus } from "@/types/order";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "🕓 Kutilmoqda",
  approved: "✅ Qabul qilindi",
  delivering: "🚚 Yetkazilmoqda",
  completed: "🎉 Yakunlandi",
  cancelled: "❌ Bekor qilindi",
};

export function formatOrderMessage(order: Order): string {
  const itemsList = order.items
    .map((item) => `• ${escapeHtml(item.name)} — ${item.quantity} x ${item.price.toLocaleString("uz-UZ")} so'm`)
    .join("\n");

  const locationLine = order.location
    ? `📍 <a href="https://maps.google.com/?q=${order.location.latitude},${order.location.longitude}">Xaritada ko'rish</a>`
    : "📍 Lokatsiya yuborilmagan";

  return [
    `🛒 <b>Yangi buyurtma #${order.id.slice(0, 8)}</b>`,
    ``,
    `👤 <b>Xaridor:</b> ${escapeHtml(order.customerName)}`,
    `📞 <b>Telefon:</b> ${escapeHtml(order.phoneNumber)}`,
    ``,
    `📦 <b>Mahsulotlar:</b>`,
    itemsList,
    ``,
    `💰 <b>Jami:</b> ${order.totalAmount.toLocaleString("uz-UZ")} so'm`,
    locationLine,
    ``,
    `Holat: ${STATUS_LABELS[order.status]}`,
  ].join("\n");
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
