import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * VIDEO ALBOMGA QANDAY TUSHADI.
 *
 * Telegram rasmni havoladan oladi, videoni esa ko'pincha rad etadi:
 * `Bad Request: ... "Wrong file identifier/HTTP URL specified"`.
 * Shuning uchun video BIZ tomonimizdan yuklab olinadi va multipart
 * (fayl) sifatida yuboriladi. Shu qoida buzilmasligi uchun test.
 */

vi.mock("./secrets", () => ({ getTelegramSecrets: async () => ({ botToken: "T", chatId: "-1" }) }));
vi.mock("./topics", () => ({
  resolveTopicConfig: async () => ({}),
  resolveThreadId: () => undefined,
}));

const { sendMediaGroup } = await import("./bot");

const calls: { url: string; init?: RequestInit }[] = [];

beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    // Mahsulot videosi (Storage havolasi) - yuklab olinadi.
    if (String(url).startsWith("https://example.com/")) {
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "video/mp4", "content-length": "3" },
      });
    }

    // Telegram API javobi.
    return new Response(JSON.stringify({ ok: true, result: [{ message_id: 9 }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
});

describe("sendMediaGroup", () => {
  it("videoni multipart bilan yuboradi, rasmni havola bilan qoldiradi", async () => {
    await sendMediaGroup("-1001", [
      { url: "https://example.com/1.jpg", type: "photo" },
      { url: "https://example.com/1.mp4", type: "video" },
    ]);

    const telegramCall = calls.find((c) => c.url.includes("api.telegram.org"));
    expect(telegramCall).toBeDefined();

    const body = telegramCall!.init?.body as FormData;
    expect(body).toBeInstanceOf(FormData);

    const media = JSON.parse(String(body.get("media"))) as { type: string; media: string }[];
    // Rasm - havola bilan, video - biriktirilgan fayl bilan.
    expect(media[0]).toMatchObject({ type: "photo", media: "https://example.com/1.jpg" });
    expect(media[1]).toMatchObject({ type: "video", media: "attach://media1" });
    expect(body.get("media1")).toBeInstanceOf(Blob);
  });

  it("faqat rasm bo'lsa oddiy JSON so'rovi ketadi", async () => {
    await sendMediaGroup("-1001", [
      { url: "https://example.com/1.jpg", type: "photo" },
      { url: "https://example.com/2.jpg", type: "photo" },
    ]);

    const telegramCall = calls.find((c) => c.url.includes("api.telegram.org"));
    expect(typeof telegramCall!.init?.body).toBe("string");
  });
});
