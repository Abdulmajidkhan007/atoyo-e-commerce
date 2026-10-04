import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { formatOrderMessage } from "./templates";
import type { Order } from "@/types/order";

const base = {
  id: "0LR28ktxABC",
  customerName: "Abdulloh",
  phoneNumber: "+998901234567",
  deliveryAddress: "Qo'qon",
  items: [{ productId: "p", name: "Kran", quantity: 1, price: 80900 }],
  subtotal: 80900,
  deliveryFee: 15000,
  totalAmount: 95900,
  paymentMethod: "transfer",
  paymentStatus: "pending",
  status: "pending",
} as unknown as Order;

describe("formatOrderMessage — kartaga o'tkazma", () => {
  it("chek kelgan bo'lsa admin nima qilishini aytadi", () => {
    const text = formatOrderMessage({ ...base, receipt: { path: "x" } } as unknown as Order);
    expect(text).toContain("Mijoz chek yubordi");
    expect(text).toContain("To'lov keldi");
    expect(text).toMatch(/95\s900/);
    // Eski chalkash juftlik qaytmasin.
    expect(text).not.toContain("to'lov kutilmoqda");
    expect(text).toContain("hali qabul qilinmagan");
  });

  it("chek yo'q bo'lsa — pul o'tkazilmagan bo'lishi mumkin", () => {
    const text = formatOrderMessage(base);
    expect(text).toContain("hali chek yubormagan");
    expect(text).not.toContain("To'lov keldi");
  });

  it("to'langandan keyin oddiy qator", () => {
    const text = formatOrderMessage({ ...base, paymentStatus: "paid" } as Order);
    expect(text).toContain("✅ to'landi");
  });
});
