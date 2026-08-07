/**
 * AI stiker rejimlari - CLIENT ham ishlatadi.
 *
 * `ai.ts` "server-only" (Gemini kaliti bilan ishlaydi), shuning
 * uchun ro'yxatning o'zi shu yerda alohida turadi.
 */
export type StickerAiMode = "prompt" | "template" | "photo" | "style";

export const STICKER_AI_MODE_LABELS: Record<StickerAiMode, string> = {
  template: "Do'kon uslubida",
  prompt: "Matndan (erkin)",
  photo: "Mahsulot suratidan",
  style: "Mavjud stiker uslubida",
};

export const STICKER_AI_MODE_HINTS: Record<StickerAiMode, string> = {
  template: "Ko'k/oltin brend uslubi — santexnika mavzusidagi belgi.",
  prompt: "Nima chizilishini o'z so'zingiz bilan yozing.",
  photo: "Mahsulot suratini yuklang — u stikerga aylantiriladi.",
  style: "Pastdagi to'plamdan namuna tanlang — AI o'sha uslubda chizadi.",
};
