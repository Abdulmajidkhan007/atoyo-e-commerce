import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { sendChatMessage } from "./bot";
import { audienceStats, clickStatsFor, topClickedProducts, type ClickStats } from "./channel-stats";
import type { Product } from "@/types/product";
import type { BlogPost } from "@/types/content";

/**
 * KANAL POSTI HISOBOTI (adminlar guruhi uchun).
 *
 * Ikki kirish nuqtasi bor:
 *
 *   1) postni kanaldan adminlar guruhiga FORWARD qilish —
 *      `handleForwardedChannelPost()` postni mahsulot/maqolaga bog'laydi
 *      va o'sha postning hisobini chiqaradi;
 *   2) `/kanal` buyrug'i — umumiy auditoriya va eng ko'p bosilgan
 *      postlar reytingi.
 *
 * NEGA "kim ko'rdi" YO'Q: Telegram Bot API postni kim ko'rganini
 * (hatto necha marta ko'rilganini ham) BERMAYDI — bunday ma'lumot
 * botlarga umuman ochilmagan. Shuning uchun bot o'zi o'lchay oladigan
 * narsani ko'rsatadi: post ostidagi tugma necha marta bosilgani,
 * kanal obunachilari va bot foydalanuvchilari soni.
 */

/** Forward qilingan post haqidagi minimal ma'lumot (ikkala Bot API shakli). */
export interface ForwardedPost {
  chatId: number;
  messageId: number;
  chatTitle?: string;
}

function formatWhen(at: number | null): string {
  if (!at) return "hali bosilmagan";
  return new Date(at).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
}

function clickLines(stats: ClickStats): string[] {
  return [
    `👆 Tugma bosilgan: <b>${stats.total}</b> marta`,
    `   • bugun: <b>${stats.today}</b> · 7 kunda: <b>${stats.week}</b>`,
    `   • oxirgi bosilish: ${formatWhen(stats.lastAt)}`,
  ];
}

/** Postga bog'langan mahsulotni topadi (`channelMessageId` bo'yicha). */
async function productByMessageId(messageId: number): Promise<Product | null> {
  const snap = await getAdminDb()
    .collection("products")
    .where("channelMessageId", "==", messageId)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  return doc ? ({ id: doc.id, ...doc.data() } as Product) : null;
}

/** Postga bog'langan blog maqolasini topadi. */
async function blogPostByMessageId(messageId: number): Promise<BlogPost | null> {
  const snap = await getAdminDb()
    .collection("blogPosts")
    .where("channelMessageId", "==", messageId)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  return doc ? ({ id: doc.id, ...doc.data() } as BlogPost) : null;
}

/**
 * Kanaldan forward qilingan postga javob: o'sha post qaysi mahsulotga
 * tegishli va u qanday natija berayotgani.
 */
export async function handleForwardedChannelPost(params: {
  chatId: number;
  threadId?: number;
  post: ForwardedPost;
}): Promise<void> {
  const { chatId, threadId, post } = params;
  const reply = (text: string) => sendChatMessage(chatId, text, { threadId });

  const product = await productByMessageId(post.messageId);
  const audience = await audienceStats();
  const subscribers =
    audience.subscribers === null ? "ma'lum emas" : `<b>${audience.subscribers}</b>`;

  if (product) {
    const stats = await clickStatsFor(product.id);
    await reply(
      [
        `📊 <b>Post hisoboti</b>`,
        "",
        `📦 ${product.name}`,
        `🆔 <b>${product.code ?? product.id}</b>${product.sku ? ` · artikul: ${product.sku}` : ""}`,
        "",
        ...clickLines(stats),
        "",
        `👥 Kanal obunachilari: ${subscribers}`,
        "",
        "<i>Telegram postni KIM ko'rganini botlarga bermaydi — shuning",
        "uchun bu yerda tugma bosilishlari sanaladi.</i>",
      ].join("\n")
    );
    return;
  }

  const blogPost = await blogPostByMessageId(post.messageId);
  if (blogPost) {
    await reply(
      [
        `📊 <b>Post hisoboti</b>`,
        "",
        `📝 Blog maqolasi: ${blogPost.title}`,
        "",
        `👥 Kanal obunachilari: ${subscribers}`,
        "",
        "<i>Maqola postida sanaladigan tugma yo'q — faqat mahsulot",
        "postlarida bosilishlar hisobi yuritiladi.</i>",
      ].join("\n")
    );
    return;
  }

  await reply(
    [
      "🤔 Bu post bazadagi mahsulotga bog'lanmagan.",
      "",
      "Sabablari: post bot orqali emas, qo'lda yozilgan; yoki mahsulot",
      "keyinchalik o'chirilgan; yoki post qayta tashlangan (eski",
      "bog'lanish uzilgan).",
      "",
      `👥 Kanal obunachilari: ${subscribers}`,
    ].join("\n")
  );
}

/** `/kanal` — umumiy auditoriya va eng ko'p bosilgan postlar. */
export async function channelReport(): Promise<string> {
  const [audience, top] = await Promise.all([audienceStats(), topClickedProducts(5)]);

  // Reytingdagi nomlar hujjatda saqlanmagan bo'lishi mumkin (bosilish
  // yozilganda faqat ID bor) - shuning uchun nomlarni shu yerda olamiz.
  const names = await Promise.all(
    top.map(async (item) => {
      if (item.name) return item.name;
      const snap = await getAdminDb().collection("products").doc(item.productId).get();
      return (snap.data()?.name as string | undefined) ?? item.productId;
    })
  );

  const lines = [
    "📡 <b>Kanal va bot hisoboti</b>",
    "",
    `👥 Kanal obunachilari: <b>${audience.subscribers ?? "ma'lum emas"}</b>`,
    `🤖 Botdan ro'yxatdan o'tganlar: <b>${audience.botUsers}</b>`,
    `⚡️ 7 kunda faol: <b>${audience.activeBotUsers}</b>`,
    "",
  ];

  if (top.length === 0) {
    lines.push("Hozircha post tugmalari bosilmagan.");
  } else {
    lines.push("🔥 <b>Eng ko'p bosilgan postlar</b>");
    top.forEach((item, index) => {
      lines.push(`${index + 1}. ${names[index]} — <b>${item.total}</b> (7 kunda ${item.week})`);
    });
  }

  lines.push(
    "",
    "<i>Postni shu guruhga forward qilsangiz — o'sha postning",
    "alohida hisobini chiqaraman.</i>"
  );

  return lines.join("\n");
}
