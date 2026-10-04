/**
 * "SAVOL-JAVOB" SAHIFASI (`settings/faq`) — admin panelda tahrirlanadi
 * (`/admin/sahifalar`). Ruscha maydonlar ixtiyoriy: bo'lmasa `/ru`
 * sahifasida o'zbekchasi chiqadi.
 */
export interface FaqItem {
  question: string;
  answer: string;
  questionRu?: string;
  answerRu?: string;
}

export interface FaqSettings {
  items: FaqItem[];
  /**
   * Admin hech qachon saqlamagan bo'lsa `false` — sahifada sozlamadan
   * YASALGAN standart savollar chiqadi (`defaultFaqItems`).
   */
  saved: boolean;
}

/** Bitta sahifada eng ko'pi bilan nechta savol. */
export const MAX_FAQ_ITEMS = 40;
