import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  addStickerToSet,
  createNewStickerSet,
  deleteMessage,
  getBotUsername,
  getStickerSet,
  sendSticker,
  uploadStickerFile,
} from "./bot";
import {
  DEFAULT_STICKER_SETTINGS,
  STICKER_SLOTS,
  type StickerInfo,
  type StickerSettings,
  type StickerSlot,
} from "@/types/sticker";

/**
 * STIKER SOZLAMALARI VA YUBORISH.
 *
 * `settings/stickers` hujjatida: qaysi slotga qaysi stiker
 * (`file_id`), bot yaratgan to'plam nomi va uning egasi.
 * 60 soniya keshlanadi - bot har xabarda Firestore'ga bormasin.
 *
 * MUHIM: stiker yuborish HECH QACHON asosiy oqimni to'xtatmaydi.
 * Slot bo'sh bo'lsa yoki Telegram xato bersa - jimgina o'tib ketiladi.
 */
const DOC_PATH = "settings/stickers";
const TTL = 60 * 1000;

let cache: { value: StickerSettings; at: number } | null = null;

function normalize(data: Partial<StickerSettings> | undefined): StickerSettings {
  const slots: Partial<Record<StickerSlot, string>> = {};
  for (const slot of STICKER_SLOTS) {
    const value = data?.slots?.[slot];
    if (typeof value === "string" && value.trim()) slots[slot] = value.trim();
  }
  return {
    packName: typeof data?.packName === "string" ? data.packName.trim() : "",
    ownerUserId:
      typeof data?.ownerUserId === "number" && Number.isFinite(data.ownerUserId)
        ? data.ownerUserId
        : null,
    extraPacks: Array.isArray(data?.extraPacks)
      ? data.extraPacks.filter((item): item is string => typeof item === "string" && !!item.trim()).slice(0, 10)
      : [],
    slots,
  };
}

export async function getStickerSettings(): Promise<StickerSettings> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  try {
    const snap = await getAdminDb().doc(DOC_PATH).get();
    const value = normalize(snap.data() as Partial<StickerSettings> | undefined);
    cache = { value, at: Date.now() };
    return value;
  } catch {
    return DEFAULT_STICKER_SETTINGS;
  }
}

export async function saveStickerSettings(
  patch: Partial<StickerSettings>
): Promise<StickerSettings> {
  const next = normalize({ ...(await getStickerSettings()), ...patch });
  await getAdminDb().doc(DOC_PATH).set({ ...next, updatedAt: Date.now() }, { merge: true });
  cache = null;
  return next;
}

/** Bitta slotga stiker biriktirish (yoki bo'shatish). */
export async function setSlotSticker(slot: StickerSlot, fileId: string): Promise<StickerSettings> {
  const current = await getStickerSettings();
  const slots = { ...current.slots };
  if (fileId.trim()) slots[slot] = fileId.trim();
  else delete slots[slot];
  return saveStickerSettings({ slots });
}

/**
 * Slotdagi stikerni yuboradi. Stiker yo'q bo'lsa yoki xato bo'lsa -
 * `null` qaytadi va hech narsa buzilmaydi.
 */
export async function sendSlotSticker(
  chatId: number | string,
  slot: StickerSlot,
  options?: { threadId?: number }
): Promise<number | null> {
  try {
    const settings = await getStickerSettings();
    const fileId = settings.slots[slot];
    if (!fileId) return null;
    const sent = await sendSticker(chatId, fileId, options);
    return sent.message_id;
  } catch (error) {
    console.error(`Stiker yuborilmadi (${slot}):`, error);
    return null;
  }
}

/**
 * "Kutish" stikeri: javob tayyorlanayotganda yuboriladi va javob
 * kelgach o'chiriladi. O'chirish funksiyasini qaytaradi.
 */
export async function sendLoadingSticker(chatId: number | string): Promise<() => Promise<void>> {
  const messageId = await sendSlotSticker(chatId, "loading");
  return async () => {
    if (messageId === null) return;
    await deleteMessage(chatId, messageId).catch(() => {});
  };
}

/**
 * Buyurtma holati → slot. Holatlar `types/order.ts` dagi
 * `OrderStatus` bilan bir xil: pending / approved / delivering /
 * completed / cancelled.
 */
export function slotForOrderStatus(status: string): StickerSlot | null {
  switch (status) {
    case "approved":
      return "order_accepted";
    case "delivering":
      return "order_delivering";
    case "completed":
      return "order_completed";
    case "cancelled":
      return "order_cancelled";
    default:
      // "pending" - buyurtma endi tushdi, u uchun `order_created` bor.
      return null;
  }
}

/* ------------------------------------------------------------------ *
 * TO'PLAMLAR
 * ------------------------------------------------------------------ */

/** To'plamdagi stikerlar (admin panelda tanlash uchun). */
export async function listPackStickers(name: string): Promise<StickerInfo[]> {
  const set = await getStickerSet(name);
  return set.stickers.map((sticker) => ({
    fileId: sticker.file_id,
    emoji: sticker.emoji ?? "",
    isAnimated: sticker.is_animated === true,
    isVideo: sticker.is_video === true,
    // Animatsiyali stikerning o'zi .tgs - ko'rish uchun thumbnail kerak.
    previewUrl: `/api/admin/stickers/file?id=${encodeURIComponent(
      sticker.thumbnail?.file_id ?? sticker.file_id
    )}`,
  }));
}

/** Bot yaratadigan to'plamning nomi (`atoyo_..._by_<bot>`). */
export async function resolvePackName(settings: StickerSettings): Promise<string> {
  if (settings.packName) return settings.packName;
  const username = await getBotUsername();
  if (!username) throw new Error("Bot username aniqlanmadi.");
  return `atoyo_by_${username}`;
}

/**
 * Yasalgan stikerni to'plamga qo'shadi. To'plam hali yo'q bo'lsa -
 * yaratadi. Qaytadi: to'plam nomi va yangi stikerning `file_id` si.
 */
export async function addStickerToPack(input: {
  buffer: Buffer;
  contentType: string;
  fileName: string;
  format: "static" | "animated" | "video";
  emoji: string;
  title?: string;
}): Promise<{ packName: string; fileId: string; created: boolean }> {
  const settings = await getStickerSettings();
  if (!settings.ownerUserId) {
    throw new Error(
      "To'plam egasi ko'rsatilmagan. Avval o'z Telegram ID ingizni kiriting (xodimlar guruhida /stikerlar buyrug'i buni aytadi)."
    );
  }

  const packName = await resolvePackName(settings);
  const uploaded = await uploadStickerFile(
    settings.ownerUserId,
    { buffer: input.buffer, fileName: input.fileName, contentType: input.contentType },
    input.format
  );

  // To'plam bormi - o'qib ko'ramiz (yo'q bo'lsa Telegram xato beradi).
  let exists = true;
  try {
    await getStickerSet(packName);
  } catch {
    exists = false;
  }

  const explain = (error: unknown): never => {
    const message = error instanceof Error ? error.message : String(error);
    // Eng ko'p uchraydigan sabab: to'plam egasi bot bilan hech qachon
    // suhbat boshlamagan - Telegram bunda "PEER_ID_INVALID" beradi.
    if (/PEER_ID_INVALID|user not found|chat not found|USER_IS_BLOCKED/i.test(message)) {
      throw new Error(
        "To'plam egasi bot bilan suhbat boshlamagan. Botni shaxsiy chatda oching va /start bosing, keyin qaytadan urinib ko'ring."
      );
    }
    if (/STICKERSET_INVALID|name is already occupied|sticker set name is already/i.test(message)) {
      throw new Error("Bu nomdagi to'plam band. Sozlamada boshqa to'plam nomini ko'rsating.");
    }
    throw new Error(message);
  };

  if (exists) {
    await addStickerToSet({
      userId: settings.ownerUserId,
      name: packName,
      fileId: uploaded,
      emoji: input.emoji,
      format: input.format,
    }).catch(explain);
  } else {
    await createNewStickerSet({
      userId: settings.ownerUserId,
      name: packName,
      title: input.title || "Atoyo Santexnika",
      fileId: uploaded,
      emoji: input.emoji,
      format: input.format,
    }).catch(explain);
  }

  if (settings.packName !== packName) await saveStickerSettings({ packName });

  // Yangi qo'shilgan stikerning `file_id` si to'plamning oxirida.
  const set = await getStickerSet(packName);
  const last = set.stickers.at(-1);
  return { packName, fileId: last?.file_id ?? uploaded, created: !exists };
}

/**
 * OMMAGA OCHIQ TO'PLAMLAR (mijozlarga havola berish uchun).
 *
 * Faqat HAQIQATAN mavjud to'plamlar qaytadi: bot to'plami birinchi
 * stiker qo'shilgunicha yaratilmaydi, shuning uchun uning havolasini
 * oldindan ko'rsatish "Stickers not found" degan tushunmovchilikka
 * olib keladi.
 */
export interface PublicPack {
  name: string;
  title: string;
  link: string;
}

let packsCache: { value: PublicPack[]; at: number } | null = null;
const PACKS_TTL = 5 * 60 * 1000;

export async function publicStickerPacks(): Promise<PublicPack[]> {
  if (packsCache && Date.now() - packsCache.at < PACKS_TTL) return packsCache.value;

  const settings = await getStickerSettings();
  const names = Array.from(new Set([settings.packName, ...settings.extraPacks].filter(Boolean)));

  const packs: PublicPack[] = [];
  for (const name of names) {
    try {
      const set = await getStickerSet(name);
      packs.push({ name, title: set.title, link: `https://t.me/addstickers/${name}` });
    } catch {
      // To'plam hali yaratilmagan yoki o'chirilgan - ko'rsatilmaydi.
    }
  }

  packsCache = { value: packs, at: Date.now() };
  return packs;
}
