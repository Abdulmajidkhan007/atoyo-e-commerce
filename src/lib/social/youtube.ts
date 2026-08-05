import "server-only";
import { getSocialSecrets } from "./secrets";

/**
 * YOUTUBE (Data API v3) - faqat VIDEO.
 *
 * YouTube'ga rasm joylab bo'lmaydi: "Community" postlarining ochiq API
 * si yo'q, API faqat video yuklashni biladi. Shuning uchun bu yerda
 * mahsulotning videosi Shorts sifatida yuklanadi (vertikal, 60 soniyagacha
 * bo'lsa YouTube uni o'zi Shorts deb oladi; sarlavhaga #Shorts qo'shiladi).
 *
 * KVOTA: bitta yuklash 1600 birlik, kunlik standart kvota 10 000 -
 * ya'ni kuniga ~6 ta video. Shu sabab YouTube avtomatik emas, admin
 * tanlaganda ishlaydi.
 *
 * Kirish: kanal egasidan olingan `refresh_token` (offline access).
 * Har yuklashdan oldin undan qisqa muddatli `access_token` olinadi.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status";
/** Videoning eng katta hajmi (Storage'dan xotiraga o'qiladi). */
const MAX_VIDEO_BYTES = 64 * 1024 * 1024;

async function getAccessToken(): Promise<string> {
  const secrets = await getSocialSecrets();
  if (!secrets.youtubeClientId || !secrets.youtubeClientSecret || !secrets.youtubeRefreshToken) {
    throw new Error("YouTube sozlanmagan (client ID/secret yoki refresh token yo'q).");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: secrets.youtubeClientId,
      client_secret: secrets.youtubeClientSecret,
      refresh_token: secrets.youtubeRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? "YouTube tokenini yangilab bo'lmadi."
    );
  }
  return data.access_token;
}

/** Videoni YouTube'ga (Shorts) yuklaydi va video ID sini qaytaradi. */
export async function uploadToYoutube(input: {
  videoUrl: string;
  title: string;
  description: string;
  tags?: string[];
}): Promise<string> {
  const token = await getAccessToken();

  // Videoni Storage'dan o'qiymiz (Meta'dan farqli - YouTube havolani
  // o'zi yuklab ololmaydi, faylni biz yuboramiz).
  const file = await fetch(input.videoUrl);
  if (!file.ok) throw new Error("Video faylini o'qib bo'lmadi.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > MAX_VIDEO_BYTES) throw new Error("Video juda katta (64MB gacha).");

  const metadata = {
    snippet: {
      // Sarlavha 100 belgigacha; #Shorts YouTube'ga qisqa video ekanini bildiradi.
      title: `${input.title.slice(0, 80)} #Shorts`,
      description: input.description.slice(0, 4900),
      tags: input.tags?.slice(0, 10),
      categoryId: "26", // Howto & Style
    },
    status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
  };

  // Multipart (related) tanasi qo'lda yig'iladi - tashqi kutubxona kerak emas.
  const boundary = `atoyo-${Date.now()}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: video/*\r\n\r\n`,
    "utf8"
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const body = Buffer.concat([head, bytes, tail]);

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body: new Uint8Array(body),
  });

  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string; errors?: { reason?: string }[] };
  };
  if (!response.ok || !data.id) {
    const reason = data.error?.errors?.[0]?.reason;
    throw new Error(
      reason === "quotaExceeded"
        ? "YouTube kunlik kvotasi tugadi (kuniga ~6 ta video)."
        : (data.error?.message ?? "YouTube videoni qabul qilmadi.")
    );
  }
  return data.id;
}

/** Kalitlarni tekshirish: kanal nomi o'qiladimi. */
export async function checkYoutubeCredentials(): Promise<string | null> {
  const token = await getAccessToken();
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = (await response.json().catch(() => ({}))) as {
    items?: { snippet?: { title?: string } }[];
  };
  return data.items?.[0]?.snippet?.title ?? null;
}
