import { MAX_FAQ_ITEMS, type FaqItem } from "@/types/site-pages";
import type { DeliverySettings } from "@/types/promo";
import { freeDeliveryText, installServiceText } from "@/lib/delivery/text";

/**
 * SAVOL-JAVOB — sof mantiq ("server-only" YO'Q: admin forma ham
 * standart ro'yxatni ko'rsatish uchun chaqiradi).
 *
 * MUHIM: standart javoblar FAQAT sozlamadan va kodda haqiqatan bor
 * imkoniyatlardan yasaladi. Eski saytdagi "2 yil kafolat", "14 kunda
 * qaytarish", "Toshkentdagi ombor" kabi va'dalar ATAYLAB yo'q — ular
 * do'kon shartiga mos emas edi. Bunday va'dani faqat admin o'zi
 * yozadi.
 */

const QUESTION_MAX = 200;
const ANSWER_MAX = 2000;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Bazadan kelgan ro'yxatni tozalaydi: bo'sh savol/javob tashlanadi. */
export function normalizeFaqItems(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  const items: FaqItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const question = clean(e.question, QUESTION_MAX);
    const answer = clean(e.answer, ANSWER_MAX);
    if (!question || !answer) continue;
    const item: FaqItem = { question, answer };
    const questionRu = clean(e.questionRu, QUESTION_MAX);
    const answerRu = clean(e.answerRu, ANSWER_MAX);
    // Ruscha faqat ikkalasi bo'lsa — yarim tarjima chalg'itadi.
    if (questionRu && answerRu) {
      item.questionRu = questionRu;
      item.answerRu = answerRu;
    }
    items.push(item);
    if (items.length >= MAX_FAQ_ITEMS) break;
  }
  return items;
}

/**
 * Admin hali saqlamagan bo'lsa chiqadigan savollar — do'konning
 * HOZIRGI sozlamasidan yasaladi (yetkazish narxi, to'lov usullari,
 * o'rnatish xizmati), shuning uchun sozlama o'zgarsa javob ham
 * o'zgaradi.
 */
export function defaultFaqItems(ctx: {
  delivery: Partial<DeliverySettings> | null | undefined;
  transferEnabled: boolean;
  onlineEnabled: boolean;
}): FaqItem[] {
  const pay = ["naqd pul — mahsulotni olganingizda"];
  if (ctx.transferEnabled) {
    pay.push("kartaga o'tkazma — buyurtmadan keyin karta raqami ko'rsatiladi, siz chek rasmini yuklaysiz");
  }
  if (ctx.onlineEnabled) pay.push("Payme yoki Click orqali onlayn");

  const items: FaqItem[] = [
    {
      question: "Qanday buyurtma beraman?",
      answer:
        "Mahsulotni savatga qo'shib buyurtmani rasmiylashtiring yoki mahsulot sahifasidagi «1 klikda» tugmasi bilan ro'yxatdan o'tmasdan buyurtma bering. Telegram bot va Android ilova orqali ham buyurtma berish mumkin.",
    },
    {
      question: "Yetkazib berish qancha turadi?",
      answer: `${freeDeliveryText(ctx.delivery)} Batafsil — «Yetkazib berish» sahifasida.`,
    },
    {
      question: "Qanday to'lash mumkin?",
      answer: `To'lov usullari: ${pay.join("; ")}.`,
    },
  ];

  const install = installServiceText(ctx.delivery);
  if (install) items.push({ question: "Mahsulotni o'rnatib berasizlarmi?", answer: install });

  items.push(
    {
      question: "Optom narxlar bormi?",
      answer:
        "Ha. Usta, quruvchi va do'konlar uchun alohida optom narxlar bor — «Optom» sahifasida ariza qoldiring, tasdiqlangach katalogda optom narx ko'rinadi.",
    },
    {
      question: "Buyurtmani bekor qilsam bo'ladimi?",
      answer:
        "Buyurtma hali jo'natilmagan bo'lsa — profilingizdagi buyurtmalar ro'yxatidan bekor qilasiz. To'lab qo'yilgan buyurtmani operator orqali bekor qilasiz, pul qaytariladi.",
    }
  );
  return items;
}

/** Joriy til uchun savol/javob (ruschasi bo'lmasa — o'zbekchasi). */
export function localizeFaq(items: FaqItem[], locale: string): { question: string; answer: string }[] {
  return items.map((item) =>
    locale === "ru" && item.questionRu && item.answerRu
      ? { question: item.questionRu, answer: item.answerRu }
      : { question: item.question, answer: item.answer }
  );
}

/** Google uchun FAQPage sxemasi (https://schema.org/FAQPage). */
export function faqJsonLd(items: { question: string; answer: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
