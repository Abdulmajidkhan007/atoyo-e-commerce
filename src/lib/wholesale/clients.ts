import "server-only";
import { randomInt } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendChatMessage, sendTopicMessage } from "@/lib/telegram/bot";
import { sendSms, isSmsConfigured } from "@/lib/sms/sender";
import { sendGenericEmail, isEmailConfigured } from "@/lib/email/mailer";
import {
  normalizeAccessKey,
  normalizeWholesalePhone,
  type WholesaleClient,
  type WholesaleStatus,
} from "@/types/wholesale";
import { escapeHtml } from "@/lib/telegram/html";

/**
 * OPTOM MIJOZLAR RO'YXATI (server tomoni).
 *
 * Mijoz o'zi ro'yxatdan o'ta olmaydi: admin uni ro'yxatga qo'shadi,
 * tizim maxfiy kalit yaratadi va uni Telegram/SMS/email orqali
 * yuboradi. Mijoz `/optom` sahifasida telefon + kalit kiritsa,
 * hisobi `client` roliga o'tadi va optom narxlarni ko'radi.
 *
 * Kalit ro'yxatning O'ZIDA saqlanadi; `wholesaleClients` kolleksiyasi
 * Firestore qoidalarida clientga butunlay yopiq.
 */

const COLLECTION = "wholesaleClients";
const COUNTER = { collection: "metadata", doc: "wholesaleCounter" } as const;

/** Chalkashadigan belgilar (0/O, 1/I) ishlatilmaydi - telefonda aytish oson. */
const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.atoyo.uz";

function randomBlock(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += KEY_ALPHABET[randomInt(KEY_ALPHABET.length)];
  return out;
}

/** ATY-7K3M-91QX ko'rinishidagi kalit. */
export function generateAccessKey(): string {
  return `ATY-${randomBlock(4)}-${randomBlock(4)}`;
}

/** Mijozning qisqa tartib raqami (1, 2, 3...) - hisoblagich hujjatida. */
async function nextClientNumber(): Promise<number> {
  const ref = getAdminDb().collection(COUNTER.collection).doc(COUNTER.doc);
  const result = await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const last = (snap.data() as { last?: number } | undefined)?.last ?? 0;
    const next = last + 1;
    tx.set(ref, { last: next, updatedAt: Date.now() }, { merge: true });
    return next;
  });
  return result;
}

export interface NewClientInput {
  name: string;
  phone: string;
  shopName: string;
  address: string;
  telegramUsername?: string;
  note?: string;
  /** Excel importda tartib raqami faylda bo'lishi mumkin. */
  number?: number;
}

/** Yangi optom mijoz (kalit avtomatik yaratiladi). */
export async function createWholesaleClient(input: NewClientInput): Promise<WholesaleClient> {
  const db = getAdminDb();
  const phone = normalizeWholesalePhone(input.phone);
  if (phone.length < 12) throw new Error(`Telefon raqam noto'g'ri: ${input.phone}`);

  // Bitta telefon - bitta mijoz: takror qo'shilsa eskisi qaytadi.
  const existing = await db.collection(COLLECTION).where("phone", "==", phone).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0]!;
    return { id: doc.id, ...doc.data() } as WholesaleClient;
  }

  const now = Date.now();
  const ref = db.collection(COLLECTION).doc();
  /**
   * Ixtiyoriy maydonlar (Telegram username, izoh) to'ldirilmagan bo'lsa
   * BO'SH MATN yoziladi: Firestore `undefined` qiymatni qabul qilmaydi
   * ("Cannot use undefined as a Firestore value" xatosi shundan edi).
   */
  const client: WholesaleClient = {
    id: ref.id,
    number: input.number && input.number > 0 ? input.number : await nextClientNumber(),
    name: input.name.trim(),
    phone,
    shopName: input.shopName.trim(),
    address: input.address.trim(),
    telegramUsername: (input.telegramUsername ?? "").trim().replace(/^@/, ""),
    accessKey: generateAccessKey(),
    status: "invited",
    userId: null,
    activatedAt: null,
    invitedAt: null,
    note: (input.note ?? "").trim(),
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(client);
  return client;
}

export async function listWholesaleClients(limit = 500): Promise<WholesaleClient[]> {
  const snapshot = await getAdminDb()
    .collection(COLLECTION)
    .orderBy("number", "asc")
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as WholesaleClient);
}

export async function updateWholesaleClient(
  id: string,
  patch: Partial<Pick<WholesaleClient, "name" | "phone" | "shopName" | "address" | "telegramUsername" | "note" | "status">>
): Promise<void> {
  // `undefined` maydonlarni Firestore qabul qilmaydi - ularni tashlaymiz.
  const data: Record<string, unknown> = { updatedAt: Date.now() };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) data[key] = value;
  }
  if (patch.phone) data.phone = normalizeWholesalePhone(patch.phone);
  await getAdminDb().collection(COLLECTION).doc(id).update(data);
}

export async function deleteWholesaleClient(id: string): Promise<void> {
  const db = getAdminDb();
  const snap = await db.collection(COLLECTION).doc(id).get();
  const client = snap.data() as WholesaleClient | undefined;

  // Hisobi faollashtirilgan bo'lsa - roli oddiy foydalanuvchiga qaytadi.
  if (client?.userId) {
    await db
      .collection("users")
      .doc(client.userId)
      .update({ role: "user", wholesaleClientId: FieldValue.delete() })
      .catch(() => undefined);
  }
  await db.collection(COLLECTION).doc(id).delete();
}

/** Kalitni qayta yaratish (eskisi ishlamay qoladi). */
export async function regenerateKey(id: string): Promise<string> {
  const accessKey = generateAccessKey();
  await getAdminDb().collection(COLLECTION).doc(id).update({
    accessKey,
    status: "invited",
    invitedAt: null,
    updatedAt: Date.now(),
  });
  return accessKey;
}

/** Mijozga yuboriladigan matn (kalit + havola). */
export function inviteText(client: WholesaleClient): string {
  return [
    `Assalomu alaykum, ${client.name}!`,
    ``,
    `Atoyo Santexnika optom mijozlari uchun shaxsiy kirish ochildi.`,
    `Do'kon: ${client.shopName}`,
    ``,
    `Kalit: ${client.accessKey}`,
    `Havola: ${SITE_URL}/optom?kalit=${encodeURIComponent(client.accessKey)}`,
    ``,
    `Havolani oching, telefon raqamingiz va kalitni kiriting — shundan keyin`,
    `saytda va ilovada OPTOM narxlarni ko'rasiz.`,
    ``,
    `Kalitni boshqalarga bermang.`,
  ].join("\n");
}

export interface InviteResult {
  telegram: boolean;
  sms: boolean;
  email: boolean;
  errors: string[];
}

/**
 * Kalitni mijozga yuboradi. Uch kanal ham mustaqil: biri ishlamasa
 * qolganlari yuboriladi va natijada nima ketgani ko'rsatiladi.
 */
export async function sendInvite(
  client: WholesaleClient,
  channels: { telegram?: boolean; sms?: boolean; email?: boolean; email_address?: string }
): Promise<InviteResult> {
  const result: InviteResult = { telegram: false, sms: false, email: false, errors: [] };
  const text = inviteText(client);

  // Telegram: mijozning chat ID'si botUsers dan topiladi (bot bilan
  // yozishgan bo'lsa). Username orqali xabar yuborib bo'lmaydi -
  // Telegram API bunga ruxsat bermaydi.
  if (channels.telegram) {
    try {
      const snap = await getAdminDb()
        .collection("botUsers")
        .where("phoneNumber", "==", `+${client.phone}`)
        .limit(1)
        .get();
      const chatId = (snap.docs[0]?.data() as { chatId?: number } | undefined)?.chatId;
      if (chatId) {
        await sendChatMessage(chatId, text.replace(/\n/g, "\n"));
        result.telegram = true;
      } else {
        result.errors.push("Telegram: mijoz botga /start bermagan.");
      }
    } catch (error) {
      result.errors.push(`Telegram: ${error instanceof Error ? error.message : "xato"}`);
    }
  }

  if (channels.sms) {
    if (!isSmsConfigured()) {
      result.errors.push("SMS: sozlanmagan.");
    } else {
      try {
        await sendSms(
          client.phone,
          `Atoyo optom kirish. Kalit: ${client.accessKey}. ${SITE_URL}/optom`
        );
        result.sms = true;
      } catch (error) {
        result.errors.push(`SMS: ${error instanceof Error ? error.message : "xato"}`);
      }
    }
  }

  if (channels.email && channels.email_address) {
    if (!isEmailConfigured()) {
      result.errors.push("Email: SMTP sozlanmagan.");
    } else {
      try {
        await sendGenericEmail(
          channels.email_address,
          "Atoyo Santexnika — optom kirish kaliti",
          `<pre style="font-family:inherit;white-space:pre-wrap">${text}</pre>`
        );
        result.email = true;
      } catch (error) {
        result.errors.push(`Email: ${error instanceof Error ? error.message : "xato"}`);
      }
    }
  }

  if (result.telegram || result.sms || result.email) {
    await getAdminDb().collection(COLLECTION).doc(client.id).update({
      invitedAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  return result;
}

/**
 * FAOLLASHTIRISH: telefon + kalit to'g'ri bo'lsa hisob `client`
 * roliga o'tadi. Kalit bir mijozga bog'langan - boshqa telefon bilan
 * ishlatib bo'lmaydi.
 */
export async function activateWholesale(params: {
  phone: string;
  accessKey: string;
  uid: string;
}): Promise<{ ok: true; client: WholesaleClient } | { ok: false; error: string }> {
  const db = getAdminDb();
  const phone = normalizeWholesalePhone(params.phone);
  const key = normalizeAccessKey(params.accessKey);

  const snapshot = await db.collection(COLLECTION).where("accessKey", "==", key).limit(1).get();
  if (snapshot.empty) return { ok: false, error: "Kalit topilmadi. Uni to'liq va to'g'ri kiriting." };

  const doc = snapshot.docs[0]!;
  const client = { id: doc.id, ...doc.data() } as WholesaleClient;

  if (client.status === "blocked") {
    return { ok: false, error: "Bu kalit to'xtatilgan. Operator bilan bog'laning." };
  }
  if (client.phone !== phone) {
    return { ok: false, error: "Telefon raqam kalitga mos kelmadi." };
  }
  if (client.userId && client.userId !== params.uid) {
    return { ok: false, error: "Bu kalit boshqa hisobga biriktirilgan." };
  }

  const now = Date.now();
  await db.collection("users").doc(params.uid).set(
    {
      role: "client",
      wholesaleClientId: client.id,
      phoneNumber: `+${phone}`,
      updatedAt: now,
    },
    { merge: true }
  );
  await doc.ref.update({ status: "active", userId: params.uid, activatedAt: now, updatedAt: now });

  await notifyStaff(
    `✅ <b>Optom mijoz faollashdi</b>\n\n№${client.number} • ${escapeHtml(client.shopName)}\n` +
      `${escapeHtml(client.name)} • +${client.phone}\n${escapeHtml(client.address)}`
  );

  return { ok: true, client: { ...client, status: "active", userId: params.uid, activatedAt: now } };
}

/** Xodimlar guruhidagi "Optom" topikka xabar (441). */
export async function notifyStaff(text: string): Promise<void> {
  try {
    await sendTopicMessage("wholesale", text);
  } catch (error) {
    // Xabar ketmasa ham asosiy amal to'xtamaydi.
    console.error("Optom topikka xabar yuborishda xato:", error);
  }
}

/** Telefon bo'yicha optom mijozni topadi (bot uchun). */
export async function findWholesaleByPhone(phone: string): Promise<WholesaleClient | null> {
  const normalized = normalizeWholesalePhone(phone);
  if (normalized.length < 12) return null;
  const snapshot = await getAdminDb()
    .collection(COLLECTION)
    .where("phone", "==", normalized)
    .where("status", "==", "active")
    .limit(1)
    .get();
  const doc = snapshot.docs[0];
  return doc ? ({ id: doc.id, ...doc.data() } as WholesaleClient) : null;
}

export type { WholesaleStatus };
