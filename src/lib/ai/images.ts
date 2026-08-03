import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, getAnthropic, isAiConfigured } from "./config";

/**
 * MAHSULOT RASMLARI UCHUN AI.
 *
 * Ikki xil ish bor va ular ikki xil modelda:
 *  1) TAHLIL - bor rasmga qarab nom/tavsif/kalit so'z taklif qilish
 *     (Claude, `ANTHROPIC_API_KEY`);
 *  2) GENERATSIYA - bitta rasmdan bir nechta savdo rasmi yasash
 *     (Google "Nano Banana" = Gemini image, `GEMINI_API_KEY`).
 *
 * QAT'IY QOIDA: generatsiya faqat MAVJUD rasm asosida ishlaydi -
 * fon tozalash, studiya ko'rinishi, interyerda ko'rsatish, yaqin plan.
 * Mahsulotning shakli, rangi, yozuvi yoki tarkibi O'ZGARTIRILMAYDI -
 * aks holda mijoz suratdagi narsani olmaydi (bu qonuniy muammo ham).
 */

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * MODEL NOMI. Google rasm modelini vaqti-vaqti bilan qayta nomlaydi
 * (preview -> barqaror), shuning uchun bitta nomga tayanib qolmaymiz:
 * ro'yxatdagi nomlar navbat bilan sinaladi va ishlagani eslab qolinadi.
 * `GEMINI_IMAGE_MODEL` berilsa - u birinchi bo'ladi.
 */
const MODEL_CANDIDATES = Array.from(
  new Set(
    [
      process.env.GEMINI_IMAGE_MODEL?.trim(),
      "gemini-2.5-flash-image",
      "gemini-2.5-flash-image-preview",
      "gemini-3-pro-image-preview",
    ].filter((name): name is string => Boolean(name))
  )
);

/** Shu seansda ishlagani aniqlangan model. */
let workingModel: string | null = null;

export function isImageAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/** Tayyor uslublar - admin tugma bosadi, prompt shu yerdan olinadi. */
export const IMAGE_STYLES = {
  studio: {
    label: "Oq fon (katalog)",
    prompt:
      "Place the exact same product on a clean pure white studio background with soft even lighting and a subtle natural shadow underneath. Product photography for an online shop catalog.",
  },
  lifestyle: {
    label: "Interyerda",
    prompt:
      "Show the exact same product installed or placed in a realistic modern bathroom or heating-room interior, natural daylight, photorealistic.",
  },
  closeup: {
    label: "Yaqin plan",
    prompt:
      "A close-up macro shot of the exact same product highlighting its material and surface finish, shallow depth of field, neutral background.",
  },
  angle: {
    label: "Boshqa rakurs",
    prompt:
      "Show the exact same product from a slightly different three-quarter angle on a light neutral background, same lighting quality as professional catalog photography.",
  },
  packaging: {
    label: "Qadoq bilan",
    prompt:
      "Show the exact same product next to a plain neutral cardboard box on a light background, catalog style. Do not print any text or logo on the box.",
  },
} as const;

export type ImageStyle = keyof typeof IMAGE_STYLES;

/** Har bir promptga qo'shiladigan o'zgarmas cheklov. */
const FIDELITY_RULE =
  "Keep the product itself EXACTLY as in the source image: same shape, size, color, material, markings and proportions. " +
  "Do not add, remove or redesign any part. Do not add text, logos, watermarks or people's faces. Photorealistic, high resolution.";

export interface GeneratedImage {
  buffer: Buffer;
  contentType: string;
}

async function fetchSourceImage(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Asl rasmni yuklab bo'lmadi.");
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 8 * 1024 * 1024) throw new Error("Asl rasm juda katta (8MB dan oshmasin).");
  return { base64: buffer.toString("base64"), mimeType: contentType.split(";")[0]! };
}

/**
 * Bitta uslub uchun bitta rasm generatsiya qiladi (Gemini image).
 * Xato bo'lsa istisno tashlaydi - chaqiruvchi uni uslub bo'yicha
 * alohida ushlaydi, shunda bitta uslub tushib qolsa ham qolganlari
 * saqlanadi.
 */
async function callModel(
  model: string,
  source: { base64: string; mimeType: string },
  prompt: string,
  apiKey: string
): Promise<GeneratedImage> {
  const response = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: source.mimeType, data: source.base64 } },
            { text: `${prompt}\n\n${FIDELITY_RULE}` },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(`Gemini (${model}) xatosi ${response.status}: ${extractMessage(detail)}`);
    // 404 - model nomi boshqacha; chaqiruvchi keyingi nomni sinaydi.
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const data = (await response.json()) as {
    candidates?: {
      finishReason?: string;
      content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] };
    }[];
  };

  const part = data.candidates?.[0]?.content?.parts?.find((item) => item.inlineData?.data);
  if (!part?.inlineData?.data) {
    const reason = data.candidates?.[0]?.finishReason;
    throw new Error(
      reason
        ? `Model rasm qaytarmadi (sabab: ${reason}). Boshqa uslub yoki izoh bilan urinib ko'ring.`
        : "Model rasm qaytarmadi."
    );
  }

  return {
    buffer: Buffer.from(part.inlineData.data, "base64"),
    contentType: part.inlineData.mimeType ?? "image/png",
  };
}

/** Google xato javobidan o'qiladigan xabarni ajratib oladi. */
function extractMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return parsed.error?.message?.slice(0, 300) ?? body.slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
}

async function generateOne(source: { base64: string; mimeType: string }, prompt: string): Promise<GeneratedImage> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY sozlanmagan.");

  const models = workingModel ? [workingModel] : MODEL_CANDIDATES;
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const image = await callModel(model, source, prompt, apiKey);
      workingModel = model;
      return image;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const status = (lastError as Error & { status?: number }).status;
      // Model topilmadi (404) yoki bu kalitga ochiq emas (403) bo'lsa
      // keyingi nomni sinaymiz; boshqa xatolarda takrorlash befoyda.
      if (status !== 404 && status !== 403) break;
    }
  }

  throw lastError ?? new Error("Gemini javob bermadi.");
}

/** Kalitga ochiq rasm modellari (xatolikni tushuntirish uchun). */
export async function listImageModels(): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return [];
  try {
    const response = await fetch(`${GEMINI_URL}?pageSize=200`, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { models?: { name?: string }[] };
    return (data.models ?? [])
      .map((model) => (model.name ?? "").replace(/^models\//, ""))
      .filter((name) => name.includes("image"));
  } catch {
    return [];
  }
}

/** Bir nechta uslubda rasm yasaydi; muvaffaqiyatsizlari jimgina tushib qoladi. */
export async function generateProductImages(params: {
  sourceUrl: string;
  styles: ImageStyle[];
  extraPrompt?: string;
}): Promise<{ images: GeneratedImage[]; failed: ImageStyle[]; errors: string[] }> {
  const source = await fetchSourceImage(params.sourceUrl);
  const images: GeneratedImage[] = [];
  const failed: ImageStyle[] = [];
  const errors: string[] = [];

  // Ketma-ket - Gemini bir vaqtda ko'p so'rovga limit qo'yadi va
  // xarajat ham nazoratda bo'ladi.
  for (const style of params.styles) {
    const prompt = params.extraPrompt?.trim()
      ? `${IMAGE_STYLES[style].prompt} ${params.extraPrompt.trim().slice(0, 300)}`
      : IMAGE_STYLES[style].prompt;
    try {
      images.push(await generateOne(source, prompt));
    } catch (error) {
      console.error(`AI rasm (${style}) xatosi:`, error);
      failed.push(style);
      const message = error instanceof Error ? error.message : String(error);
      if (!errors.includes(message)) errors.push(message);
    }
  }

  return { images, failed, errors };
}

/** Claude vision faqat shu turlarni qabul qiladi. */
function visionMediaType(mimeType: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  switch (mimeType) {
    case "image/png":
      return "image/png";
    case "image/webp":
      return "image/webp";
    case "image/gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

export interface ImageAnalysis {
  name: string;
  description: string;
  keywords: string[];
  category: string;
  material: string;
  brand: string;
}

/**
 * RASM TAHLILI (Claude vision): admin "Tahlil qilish" tugmasini
 * bosganda rasmga qarab nom/tavsif/kalit so'z taklif qilinadi.
 * Taklif AVTOMATIK saqlanmaydi - admin ko'rib, tahrirlab qabul qiladi.
 */
export async function analyzeProductImage(imageUrl: string, hint?: string): Promise<ImageAnalysis> {
  if (!isAiConfigured()) throw new Error("ANTHROPIC_API_KEY sozlanmagan.");

  const source = await fetchSourceImage(imageUrl);
  const response = await getAnthropic().messages.create({
    model: AI_MODEL,
    max_tokens: 700,
    system:
      "Sen santexnika va isitish tizimlari do'koni uchun mahsulot kartochkasini to'ldiruvchi yordamchisan. " +
      "Faqat rasmda KO'RINGAN narsani yoz - o'lcham, kafolat yoki brendni taxmin qilma (ko'rinmasa bo'sh qoldir). " +
      'Javobni FAQAT JSON ko\'rinishida ber: {"name":"","description":"","keywords":[],"category":"","material":"","brand":""}. ' +
      "Nom va tavsif o'zbekcha bo'lsin; tavsif 2-4 gap. `keywords` - shu mahsulotni almashtira oladigan 3-6 ta umumiy nom.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: visionMediaType(source.mimeType), data: source.base64 },
          },
          {
            type: "text",
            text: hint?.trim()
              ? `Mahsulot haqida ma'lum: ${hint.trim().slice(0, 200)}. Rasmga qarab kartochkani to'ldir.`
              : "Rasmga qarab mahsulot kartochkasini to'ldir.",
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Model matn bilan o'rab yuborishi mumkin - JSON qismini ajratib olamiz.
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json) as Partial<ImageAnalysis>;

  return {
    name: (parsed.name ?? "").slice(0, 200),
    description: (parsed.description ?? "").slice(0, 2000),
    keywords: (parsed.keywords ?? []).slice(0, 6).map((item) => String(item).slice(0, 60)),
    category: (parsed.category ?? "").slice(0, 60),
    material: (parsed.material ?? "").slice(0, 60),
    brand: (parsed.brand ?? "").slice(0, 120),
  };
}
