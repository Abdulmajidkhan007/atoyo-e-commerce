import "server-only";

/**
 * SMS YUBORISH (O'zbekiston operatorlari).
 *
 * Ikki provayder qo'llab-quvvatlanadi, env orqali tanlanadi:
 *
 *   • ESKIZ (eskiz.uz) — TAVSIYA ETILADI. Email+parol bilan token
 *     olinadi, token 30 kun yashaydi va shu yerda keshlanadi.
 *       SMS_PROVIDER=eskiz
 *       ESKIZ_EMAIL=...
 *       ESKIZ_PASSWORD=...
 *       SMS_SENDER=4546            (standart; o'z nomingiz tasdiqlansa - o'sha)
 *
 *   • PLAY MOBILE (playmobile.uz) — XML/JSON API, login+parol.
 *       SMS_PROVIDER=playmobile
 *       PLAYMOBILE_LOGIN=...
 *       PLAYMOBILE_PASSWORD=...
 *       PLAYMOBILE_URL=https://send.smsxabar.uz/broker-api/send
 *       SMS_SENDER=3700
 *
 * Sozlanmagan bo'lsa hech narsa yubormaydi va xato ham bermaydi —
 * buyurtma jarayoniga ta'sir qilmaydi (email va push kabi best-effort).
 *
 * MUHIM: O'zbekistonda reklama SMS uchun matn shabloni operator/provayder
 * tomonidan tasdiqlanishi kerak. Tranzaksion xabarlar (buyurtma holati)
 * odatda tez tasdiqlanadi.
 */

const ESKIZ_BASE = "https://notify.eskiz.uz/api";

export function smsProvider(): "eskiz" | "playmobile" | null {
  const provider = process.env.SMS_PROVIDER?.toLowerCase();
  if (provider === "eskiz" && process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD) return "eskiz";
  if (
    provider === "playmobile" &&
    process.env.PLAYMOBILE_LOGIN &&
    process.env.PLAYMOBILE_PASSWORD
  ) {
    return "playmobile";
  }
  return null;
}

export function isSmsConfigured(): boolean {
  return smsProvider() !== null;
}

/** Eskiz tokeni - 30 kun yashaydi, shuning uchun xotirada saqlanadi. */
let eskizToken: { value: string; at: number } | null = null;
const TOKEN_TTL_MS = 20 * 24 * 60 * 60 * 1000;

async function getEskizToken(): Promise<string> {
  if (eskizToken && Date.now() - eskizToken.at < TOKEN_TTL_MS) return eskizToken.value;

  const body = new FormData();
  body.append("email", process.env.ESKIZ_EMAIL ?? "");
  body.append("password", process.env.ESKIZ_PASSWORD ?? "");

  const res = await fetch(`${ESKIZ_BASE}/auth/login`, { method: "POST", body });
  const data = (await res.json()) as { data?: { token?: string }; message?: string };
  const token = data.data?.token;
  if (!token) throw new Error(data.message ?? "Eskiz tokenini olib bo'lmadi.");

  eskizToken = { value: token, at: Date.now() };
  return token;
}

/** Raqamni operator kutgan ko'rinishga keltiradi: 998901234567. */
function normalizeForSms(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) return digits;
  if (digits.length === 9) return `998${digits}`;
  return null;
}

/**
 * Bitta SMS. Muvaffaqiyat/xatoni `boolean` bilan qaytaradi — chaqiruvchi
 * uchun xatolik hech qachon tashlanmaydi.
 */
export async function sendSms(phone: string, text: string): Promise<boolean> {
  const provider = smsProvider();
  if (!provider) return false;

  const to = normalizeForSms(phone);
  if (!to) return false;

  const from = process.env.SMS_SENDER ?? "4546";

  try {
    if (provider === "eskiz") {
      const token = await getEskizToken();
      const body = new FormData();
      body.append("mobile_phone", to);
      body.append("message", text);
      body.append("from", from);

      const res = await fetch(`${ESKIZ_BASE}/message/sms/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      if (res.status === 401) {
        // Token eskirgan - bir marta yangilab qayta urinamiz.
        eskizToken = null;
        const retryToken = await getEskizToken();
        const retry = await fetch(`${ESKIZ_BASE}/message/sms/send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${retryToken}` },
          body,
        });
        return retry.ok;
      }
      return res.ok;
    }

    // Play Mobile
    const url = process.env.PLAYMOBILE_URL ?? "https://send.smsxabar.uz/broker-api/send";
    const auth = Buffer.from(
      `${process.env.PLAYMOBILE_LOGIN}:${process.env.PLAYMOBILE_PASSWORD}`
    ).toString("base64");

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        messages: [
          {
            recipient: to,
            "message-id": `atoyo-${Date.now()}`,
            sms: { originator: from, content: { text } },
          },
        ],
      }),
    });
    return res.ok;
  } catch (error) {
    console.error("SMS yuborishda xato:", error);
    return false;
  }
}
