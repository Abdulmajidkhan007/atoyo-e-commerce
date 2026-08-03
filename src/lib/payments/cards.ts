import "server-only";

/**
 * SAQLANGAN KARTALAR (Payme Subscribe API).
 *
 * Oqim (Payme talab qiladigan tartib):
 *   1) `cards.create`          — karta raqami + amal muddati → TOKEN;
 *   2) `cards.get_verify_code` — kartaga bog'langan raqamga SMS kod;
 *   3) `cards.verify`          — kodni tasdiqlash → token to'liq ishlaydi;
 *   4) `receipts.create` + `receipts.pay` — keyingi buyurtmalarni shu
 *      token bilan to'lash (mijoz karta raqamini qayta kiritmaydi).
 *
 * MUHIM: karta RAQAMI hech qayerda saqlanmaydi va Firestore'ga
 * yozilmaydi — u faqat serverdan Payme'ga o'tadi. Bizda faqat TOKEN
 * va niqoblangan raqam (860600******1234) qoladi. Token maxfiy:
 * `users/{uid}/cards` faqat Admin SDK orqali o'qiladi (Firestore
 * qoidalarida mijozga yopilgan).
 *
 * Kalitlar bo'lmasa butun oqim o'chiq: `isCardSaveConfigured()` false
 * qaytaradi, profildagi "Kartalarim" bo'limi ko'rinmaydi.
 *
 * Kalitlar kelgach birinchi ish: Payme test kabinetida (test.paycom.uz)
 * bitta kartani qo'shib, kod bilan tasdiqlab ko'rish.
 */

const PAYME_API = process.env.PAYME_API_URL?.trim() || "https://checkout.paycom.uz/api";

export function isCardSaveConfigured(): boolean {
  return Boolean(process.env.PAYME_MERCHANT_ID?.trim() && process.env.PAYME_SUBSCRIBE_KEY?.trim());
}

export interface SavedCardInfo {
  token: string;
  maskedNumber: string;
  expire: string;
  verified: boolean;
}

interface PaymeCard {
  token: string;
  number: string;
  expire: string;
  verify: boolean;
  recurrent?: boolean;
}

/** Payme JSON-RPC chaqiruvi. `auth` — cards.* uchun kassa ID, receipts.* uchun "ID:kalit". */
async function callPayme<T>(method: string, params: Record<string, unknown>, auth: string): Promise<T> {
  const response = await fetch(PAYME_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth": auth },
    body: JSON.stringify({ id: Date.now(), method, params }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    result?: T;
    error?: { code: number; message: string | Record<string, string> };
  };

  if (data.error) {
    const message =
      typeof data.error.message === "string"
        ? data.error.message
        : (data.error.message?.uz ?? data.error.message?.ru ?? "To'lov tizimi xatosi");
    throw new Error(message);
  }
  if (!data.result) throw new Error("To'lov tizimidan javob kelmadi.");
  return data.result;
}

function merchantAuth(): string {
  return process.env.PAYME_MERCHANT_ID ?? "";
}

function receiptsAuth(): string {
  return `${process.env.PAYME_MERCHANT_ID ?? ""}:${process.env.PAYME_SUBSCRIBE_KEY ?? ""}`;
}

/** 1-qadam: kartadan token olish (hali tasdiqlanmagan). */
export async function createCardToken(number: string, expire: string): Promise<SavedCardInfo> {
  const result = await callPayme<{ card: PaymeCard }>(
    "cards.create",
    { card: { number: number.replace(/\s/g, ""), expire: expire.replace(/\D/g, "") }, save: true },
    merchantAuth()
  );

  return {
    token: result.card.token,
    maskedNumber: result.card.number,
    expire: result.card.expire,
    verified: result.card.verify,
  };
}

/** 2-qadam: kartaga bog'langan raqamga SMS kod yuborish. */
export async function sendCardVerifyCode(token: string): Promise<{ sentTo?: string }> {
  const result = await callPayme<{ sent: boolean; phone?: string }>(
    "cards.get_verify_code",
    { token },
    merchantAuth()
  );
  return { sentTo: result.phone };
}

/** 3-qadam: kodni tasdiqlash. */
export async function verifyCard(token: string, code: string): Promise<SavedCardInfo> {
  const result = await callPayme<{ card: PaymeCard }>(
    "cards.verify",
    { token, code: code.replace(/\D/g, "") },
    merchantAuth()
  );

  return {
    token: result.card.token,
    maskedNumber: result.card.number,
    expire: result.card.expire,
    verified: result.card.verify,
  };
}

/** Kartani o'chirish (mijoz "olib tashlash" bosganda). */
export async function removeCard(token: string): Promise<void> {
  await callPayme<{ success: boolean }>("cards.remove", { token }, merchantAuth());
}

/** Token hali ishlayaptimi (muddati o'tmaganmi). */
export async function checkCard(token: string): Promise<boolean> {
  try {
    const result = await callPayme<{ card: PaymeCard }>("cards.check", { token }, merchantAuth());
    return result.card.verify;
  } catch {
    return false;
  }
}

/**
 * Saqlangan karta bilan to'lash: chek yaratiladi va to'lanadi.
 * Summa TIYINda ketadi (so'm × 100) — Payme shunday talab qiladi.
 */
export async function payWithSavedCard(params: {
  token: string;
  orderId: string;
  amountSom: number;
}): Promise<{ receiptId: string }> {
  const receipt = await callPayme<{ receipt: { _id: string } }>(
    "receipts.create",
    {
      amount: Math.round(params.amountSom * 100),
      account: { order_id: params.orderId },
    },
    receiptsAuth()
  );

  await callPayme<{ receipt: { _id: string; state: number } }>(
    "receipts.pay",
    { id: receipt.receipt._id, token: params.token },
    receiptsAuth()
  );

  return { receiptId: receipt.receipt._id };
}
