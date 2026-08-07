import "server-only";
import { sendChatMessage } from "./bot";
import {
  getStickerSettings,
  saveStickerSettings,
  setSlotSticker,
} from "./stickers";
import { STICKER_SLOTS, STICKER_SLOT_INFO, type StickerSlot } from "@/types/sticker";

/**
 * XODIMLAR GURUHIDA STIKER BOSHQARUVI.
 *
 * Saytga kirmasdan, telefonning o'zidan stiker biriktirish uchun:
 *
 *   1) guruhga stiker tashlansa - bot uning `file_id` sini aytadi
 *      va to'plamni eslab qoladi (saytda ko'rinadi);
 *   2) stikerga REPLY qilib `/stiker start` yozilsa - o'sha stiker
 *      "salomlashuv" slotiga biriktiriladi;
 *   3) `/stiker` - slotlar ro'yxati va hozirgi holat;
 *   4) `/stiker egasi` - to'plam egasi sifatida o'zini belgilash
 *      (saytda yangi stiker yasash uchun shu kerak).
 */

export interface IncomingSticker {
  file_id: string;
  set_name?: string;
  emoji?: string;
  is_animated?: boolean;
  is_video?: boolean;
}

function slotList(taken: Partial<Record<StickerSlot, string>>): string {
  return STICKER_SLOTS.map((slot) => {
    const info = STICKER_SLOT_INFO[slot];
    const mark = taken[slot] ? "✅" : "▫️";
    return `${mark} <code>${slot}</code> — ${info.label}\n     <i>${info.when}</i>`;
  }).join("\n");
}

/** To'plam nomini eslab qolamiz - saytda shu to'plam ko'rinadi. */
async function rememberPack(setName: string | undefined): Promise<boolean> {
  if (!setName) return false;
  const settings = await getStickerSettings();
  if (settings.packName === setName || settings.extraPacks.includes(setName)) return false;
  await saveStickerSettings({ extraPacks: [...settings.extraPacks, setName] });
  return true;
}

/** Guruhga oddiy stiker tashlanganda - `file_id` ni aytamiz. */
export async function handleStickerMessage(params: {
  chatId: number;
  threadId?: number;
  sticker: IncomingSticker;
}): Promise<void> {
  const { chatId, threadId, sticker } = params;
  const added = await rememberPack(sticker.set_name);

  const kind = sticker.is_video ? "video" : sticker.is_animated ? "animatsiyali" : "oddiy";
  const lines = [
    `🎨 <b>Stiker</b> (${kind})`,
    ``,
    `<code>${sticker.file_id}</code>`,
    sticker.set_name ? `To'plam: <code>${sticker.set_name}</code>` : "",
    added ? `✅ To'plam saqlandi — endi saytda ham ko'rinadi.` : "",
    ``,
    `Biriktirish uchun shu stikerga <b>reply</b> qilib yozing:`,
    `<code>/stiker start</code>  (yoki boshqa slot nomi)`,
    `Slotlar ro'yxati: /stiker`,
  ].filter(Boolean);

  await sendChatMessage(chatId, lines.join("\n"), { threadId });
}

/** `/stiker ...` buyrug'i. */
export async function handleStickerCommand(params: {
  chatId: number;
  threadId?: number;
  userId?: number;
  argsText: string;
  replySticker?: IncomingSticker;
}): Promise<void> {
  const { chatId, threadId, userId, argsText, replySticker } = params;
  const reply = (text: string) => sendChatMessage(chatId, text, { threadId });
  const arg = argsText.trim().toLowerCase();
  const settings = await getStickerSettings();

  // To'plam egasi - saytda yangi stiker yasash uchun kerak.
  if (arg === "egasi" || arg === "owner") {
    if (!userId) {
      await reply("Foydalanuvchi aniqlanmadi.");
      return;
    }
    await saveStickerSettings({ ownerUserId: userId });
    await reply(
      `✅ To'plam egasi belgilandi: <code>${userId}</code>\n\n` +
        `Endi saytda (Admin → Stikerlar) yangi stiker yasab, to'plamga qo'shish mumkin.`
    );
    return;
  }

  // Bo'shatish: /stiker olib start
  if (arg.startsWith("olib ")) {
    const slot = arg.slice(5).trim() as StickerSlot;
    if (!STICKER_SLOTS.includes(slot)) {
      await reply(`Bunday slot yo'q: <code>${slot}</code>`);
      return;
    }
    await setSlotSticker(slot, "");
    await reply(`🗑 <code>${slot}</code> slotidan stiker olib tashlandi.`);
    return;
  }

  // Slotga biriktirish - stikerga reply qilingan bo'lishi kerak.
  if (arg) {
    const slot = arg as StickerSlot;
    if (!STICKER_SLOTS.includes(slot)) {
      await reply(
        `Bunday slot yo'q: <code>${arg}</code>\n\nSlotlar:\n${slotList(settings.slots)}`
      );
      return;
    }
    if (!replySticker) {
      await reply(
        `Buyruqni <b>stikerga reply qilib</b> yozing.\n\n` +
          `Ya'ni: stikerni ushlab turing → "Reply" → <code>/stiker ${slot}</code>`
      );
      return;
    }

    await rememberPack(replySticker.set_name);
    await setSlotSticker(slot, replySticker.file_id);
    const info = STICKER_SLOT_INFO[slot];
    await reply(`✅ Stiker biriktirildi: <b>${info.label}</b>\n<i>${info.when}</i>`);
    return;
  }

  // Argumentsiz - ko'rsatma va holat.
  const owner = settings.ownerUserId
    ? `<code>${settings.ownerUserId}</code>`
    : `belgilanmagan — <code>/stiker egasi</code>`;

  await reply(
    [
      `🎨 <b>Bot stikerlari</b>`,
      ``,
      `Stikerni guruhga tashlang — bot uning kodini aytadi.`,
      `Biriktirish: stikerga <b>reply</b> qilib <code>/stiker &lt;slot&gt;</code>.`,
      `Olib tashlash: <code>/stiker olib &lt;slot&gt;</code>`,
      ``,
      slotList(settings.slots),
      ``,
      `To'plam egasi: ${owner}`,
      settings.packName ? `Bot to'plami: <code>${settings.packName}</code>` : "",
      ``,
      `Yangi stiker yasash — saytda: Admin → Stikerlar.`,
    ]
      .filter(Boolean)
      .join("\n")
  );
}
