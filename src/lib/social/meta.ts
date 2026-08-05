import "server-only";
import { getSocialSecrets } from "./secrets";

/**
 * INSTAGRAM VA FACEBOOK (Meta Graph API).
 *
 * Ikkalasi bitta token bilan ishlaydi: Facebook SAHIFA tokeni.
 * Instagram uchun akkaunt "Professional (Business)" bo'lishi va o'sha
 * sahifaga bog'langan bo'lishi shart.
 *
 * Instagram nashri IKKI QADAM:
 *   1) konteyner yaratiladi (rasm/video havolasi + izoh);
 *   2) konteyner nashr qilinadi.
 * Video (Reels) tayyorlanishini kutish kerak - shuning uchun holati
 * so'ralib turiladi.
 *
 * Rasm/video HAVOLA orqali beriladi: Meta serverlari uni o'zi yuklab
 * oladi, ya'ni fayl ochiq URL da bo'lishi kerak (bizda Firebase
 * Storage havolalari shunday).
 */

const GRAPH = "https://graph.facebook.com/v21.0";

async function graph<T>(
  path: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "POST"
): Promise<T> {
  const url = new URL(`${GRAPH}/${path}`);
  const body = new URLSearchParams(params);

  const response =
    method === "GET"
      ? await fetch(`${url.toString()}?${body.toString()}`)
      : await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });

  const data = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number; error_user_msg?: string };
  } & T;

  if (!response.ok || data.error) {
    const message =
      data.error?.error_user_msg ??
      data.error?.message ??
      `Meta API xatosi (${response.status})`;
    throw new Error(message);
  }
  return data;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ */
/* Instagram                                                           */
/* ------------------------------------------------------------------ */

/** Konteyner tayyor bo'lishini kutadi (video uchun muhim). */
async function waitForContainer(containerId: string, token: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const status = await graph<{ status_code?: string }>(
      containerId,
      { fields: "status_code", access_token: token },
      "GET"
    );
    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR") throw new Error("Instagram videoni qabul qilmadi.");
    await sleep(3000);
  }
  throw new Error("Instagram video tayyorlash uzoq davom etdi.");
}

/**
 * Instagram'ga post: 1 ta rasm, karusel (2-10 rasm) yoki Reels (video).
 * Natijada post ID si qaytadi.
 */
export async function publishToInstagram(input: {
  caption: string;
  images: string[];
  video?: string;
}): Promise<string> {
  const secrets = await getSocialSecrets();
  if (!secrets.igUserId || !secrets.pageAccessToken) {
    throw new Error("Instagram sozlanmagan (IG User ID yoki sahifa tokeni yo'q).");
  }
  const token = secrets.pageAccessToken;
  const user = secrets.igUserId;

  let creationId: string;

  if (input.video) {
    // Video - Reels sifatida (Instagram oddiy video postni qabul qilmaydi).
    const container = await graph<{ id: string }>(`${user}/media`, {
      media_type: "REELS",
      video_url: input.video,
      caption: input.caption,
      access_token: token,
    });
    await waitForContainer(container.id, token);
    creationId = container.id;
  } else if (input.images.length > 1) {
    // Karusel: avval har bir rasm uchun bola-konteyner.
    const children: string[] = [];
    for (const image of input.images.slice(0, 10)) {
      const child = await graph<{ id: string }>(`${user}/media`, {
        image_url: image,
        is_carousel_item: "true",
        access_token: token,
      });
      children.push(child.id);
    }
    const container = await graph<{ id: string }>(`${user}/media`, {
      media_type: "CAROUSEL",
      children: children.join(","),
      caption: input.caption,
      access_token: token,
    });
    creationId = container.id;
  } else {
    const image = input.images[0];
    if (!image) throw new Error("Instagram uchun kamida bitta rasm kerak.");
    const container = await graph<{ id: string }>(`${user}/media`, {
      image_url: image,
      caption: input.caption,
      access_token: token,
    });
    creationId = container.id;
  }

  const published = await graph<{ id: string }>(`${user}/media_publish`, {
    creation_id: creationId,
    access_token: token,
  });
  return published.id;
}

/* ------------------------------------------------------------------ */
/* Facebook sahifasi                                                   */
/* ------------------------------------------------------------------ */

/** Facebook sahifasiga rasm (yoki video) post qiladi. */
export async function publishToFacebook(input: {
  caption: string;
  images: string[];
  video?: string;
}): Promise<string> {
  const secrets = await getSocialSecrets();
  if (!secrets.pageId || !secrets.pageAccessToken) {
    throw new Error("Facebook sozlanmagan (sahifa ID si yoki tokeni yo'q).");
  }
  const token = secrets.pageAccessToken;

  if (input.video) {
    const posted = await graph<{ id: string }>(`${secrets.pageId}/videos`, {
      file_url: input.video,
      description: input.caption,
      access_token: token,
    });
    return posted.id;
  }

  const image = input.images[0];
  if (!image) throw new Error("Facebook uchun kamida bitta rasm kerak.");

  const posted = await graph<{ id: string; post_id?: string }>(`${secrets.pageId}/photos`, {
    url: image,
    message: input.caption,
    access_token: token,
  });
  return posted.post_id ?? posted.id;
}

/**
 * Kalitlarni tekshirish: sahifa nomi va Instagram akkaunti o'qiladimi.
 * Admin panelidagi "Tekshirish" tugmasi shuni chaqiradi.
 */
export async function checkMetaCredentials(): Promise<{ page?: string; instagram?: string }> {
  const secrets = await getSocialSecrets();
  const result: { page?: string; instagram?: string } = {};

  if (secrets.pageId && secrets.pageAccessToken) {
    const page = await graph<{ name?: string }>(
      secrets.pageId,
      { fields: "name", access_token: secrets.pageAccessToken },
      "GET"
    );
    result.page = page.name;
  }
  if (secrets.igUserId && secrets.pageAccessToken) {
    const account = await graph<{ username?: string }>(
      secrets.igUserId,
      { fields: "username", access_token: secrets.pageAccessToken },
      "GET"
    );
    result.instagram = account.username;
  }
  return result;
}
