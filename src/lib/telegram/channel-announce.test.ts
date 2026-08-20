import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * KANAL POSTINI ALMASHTIRISH TARTIBI.
 *
 * Bir marta shunday bo'lgan: mahsulotga VIDEO qo'shilgach media soni
 * o'zgardi, bot eski postni O'CHIRDI, keyin yangisini yubormoqchi
 * bo'ldi va Telegram uni qabul qilmadi — natijada kanalda mahsulot
 * umuman qolmadi.
 *
 * Shu sabab qoida: YANGI POST AVVAL YUBORILADI, eskisi faqat
 * shundan keyin o'chiriladi. Quyidagi testlar shuni qo'riqlaydi.
 */

const deleted: { chatId: string | number; messageId: number }[] = [];
let mediaGroupBehaviour: "ok" | "throw" = "ok";
let singleBehaviour: "ok" | "throw" = "ok";
const mediaGroupCalls: { type: string }[][] = [];

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: () => ({ update: async () => {}, get: async () => ({ exists: false }) }),
    }),
  }),
}));
vi.mock("@/lib/firebase/admin-content", () => ({ getSiteSettings: async () => ({}) }));
vi.mock("@/lib/products/taxonomy-server", () => ({
  getTaxonomy: async () => ({ categories: [], materials: [], units: [] }),
}));
vi.mock("@/lib/notifications/push", () => ({
  sendPushToTopic: async () => {},
  PRODUCTS_TOPIC: "products",
}));
vi.mock("@/lib/products/pricing-settings", () => ({
  getPricingSettings: async () => ({ retailMarkupPercent: 5 }),
}));
vi.mock("@/lib/orders/pricing", () => ({ getDeliverySettings: async () => ({}) }));
vi.mock("./action-log", () => ({ logAction: async () => {} }));
vi.mock("@/lib/social/publish", () => ({ enqueueProduct: async () => 0 }));
vi.mock("./bot", () => ({
  sendChatMessage: async () => {
    if (singleBehaviour === "throw") throw new Error("Bad Request: failed to send message");
    return { message_id: 55 };
  },
  sendMediaGroup: async (_chatId: string, items: { type: string }[]) => {
    mediaGroupCalls.push(items);
    if (mediaGroupBehaviour === "throw") {
      throw new Error("Bad Request: failed to get HTTP URL content");
    }
    return [{ message_id: 77 }];
  },
  editMessageCaptionOrText: async () => {},
  deleteMessage: async (chatId: string | number, messageId: number) => {
    deleted.push({ chatId, messageId });
  },
}));

process.env.TELEGRAM_CHANNEL_ID = "-1001";

const { announceProduct } = await import("./channel");

/** Kanalda posti bor, endi VIDEO qo'shilgan mahsulot. */
const product = {
  id: "p1",
  slug: "kran",
  name: "Parda Lenox",
  nameSearchIndex: "parda lenox",
  description: "",
  sku: "PL-1",
  category: "",
  brand: "",
  manufacturerCountry: "",
  supplier: "",
  material: "",
  unit: "dona",
  dimensions: {},
  price: 49900,
  costPrice: null,
  discountPrice: null,
  discountUntil: null,
  currency: "UZS" as const,
  stock: 5,
  images: ["https://example.com/1.jpg"],
  videos: ["https://example.com/1.mp4"],
  thumbnailUrl: "https://example.com/1.jpg",
  isActive: true,
  salesCount: 0,
  createdAt: 0,
  updatedAt: 0,
  // Kanalda BITTA rasmli post turibdi; endi media 2 ta bo'ldi.
  channelChatId: "-1001",
  channelMessageId: 42,
  channelPhotoCount: 1,
};

beforeEach(() => {
  deleted.length = 0;
  mediaGroupCalls.length = 0;
  mediaGroupBehaviour = "ok";
  singleBehaviour = "ok";
});

describe("announceProduct - postni almashtirish", () => {
  it("yangisi chiqqandan keyingina eskisini o'chiradi", async () => {
    const result = await announceProduct(product, "updated");

    expect(result).toBe("posted");
    expect(deleted).toEqual([{ chatId: "-1001", messageId: 42 }]);
  });

  it("yangi post yiqilsa ESKISI JOYIDA QOLADI", async () => {
    mediaGroupBehaviour = "throw";
    singleBehaviour = "throw";

    const result = await announceProduct(product, "updated");

    expect(result).toBe("failed");
    expect(deleted).toEqual([]);
  });

  it("albom videosi o'tmasa - videosiz qayta uriniladi", async () => {
    // Birinchi urinish (rasm + video) yiqiladi, ikkinchisi - faqat
    // bitta rasm, ya'ni albom emas, oddiy post orqali ketadi.
    mediaGroupBehaviour = "throw";

    const result = await announceProduct(product, "updated");

    expect(result).toBe("posted");
    // Albomga rasm ham, video ham berilgan edi.
    expect(mediaGroupCalls[0]?.map((item) => item.type)).toEqual(["photo", "video"]);
    // Eski post yangisi chiqqandan keyin o'chirildi.
    expect(deleted).toEqual([{ chatId: "-1001", messageId: 42 }]);
  });
});
