import "server-only";

/**
 * Payme/Click to'lov tizimlari konfiguratsiyasi. Barchasi env orqali -
 * merchant kalitlari qo'shilishi bilan to'lov avtomatik faollashadi,
 * kod o'zgartirish shart emas.
 *
 * Kerakli env'lar (Netlify'da NON-SECRET qilib qo'ying):
 *   PAYME_MERCHANT_ID  - Payme kassa ID (checkout.paycom.uz uchun)
 *   PAYME_KEY          - Payme Merchant API paroli (webhook autentifikatsiyasi)
 *   CLICK_MERCHANT_ID  - Click merchant ID
 *   CLICK_SERVICE_ID   - Click xizmat ID
 *   CLICK_SECRET_KEY   - Click maxfiy kalit (imzo tekshirish)
 */

export function isPaymeConfigured(): boolean {
  return !!process.env.PAYME_MERCHANT_ID && !!process.env.PAYME_KEY;
}

export function isClickConfigured(): boolean {
  return (
    !!process.env.CLICK_MERCHANT_ID && !!process.env.CLICK_SERVICE_ID && !!process.env.CLICK_SECRET_KEY
  );
}

export function isAnyPaymentConfigured(): boolean {
  return isPaymeConfigured() || isClickConfigured();
}

/** Payme checkout havolasi. Summa TIYINda (so'm × 100). */
export function buildPaymeCheckoutUrl(orderId: string, amountSom: number): string {
  const merchantId = process.env.PAYME_MERCHANT_ID ?? "";
  const params = `m=${merchantId};ac.order_id=${orderId};a=${Math.round(amountSom * 100)}`;
  return `https://checkout.paycom.uz/${Buffer.from(params).toString("base64")}`;
}

/** Click checkout havolasi. Summa SO'Mda. */
export function buildClickCheckoutUrl(orderId: string, amountSom: number, returnUrl: string): string {
  const q = new URLSearchParams({
    service_id: process.env.CLICK_SERVICE_ID ?? "",
    merchant_id: process.env.CLICK_MERCHANT_ID ?? "",
    amount: String(amountSom),
    transaction_param: orderId,
    return_url: returnUrl,
  });
  return `https://my.click.uz/services/pay?${q.toString()}`;
}
