import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ show: true as boolean | undefined }));

vi.mock("@/lib/firebase/admin-content", () => ({
  getSiteSettings: async () => ({ showTestimonials: state.show }),
}));
vi.mock("@/lib/reviews/testimonials", () => ({
  loadTestimonials: async () => [
    {
      id: "r1",
      authorName: "Abdulla K.",
      rating: 5,
      comment: "Zo'r",
      productId: "p1",
      productName: "Kran",
      createdAt: 1,
      // Ortiqcha maydonlar javobga chiqmasligi kerak.
      userId: "tg:12345",
      price: 99000,
    },
  ],
}));

import { GET } from "./route";

describe("GET /api/content/testimonials", () => {
  beforeEach(() => {
    state.show = true;
  });

  it("uid va narx chiqmaydi", async () => {
    const body = await (await GET()).json();
    expect(body.testimonials).toEqual([
      {
        id: "r1",
        authorName: "Abdulla K.",
        rating: 5,
        comment: "Zo'r",
        productId: "p1",
        productName: "Kran",
        createdAt: 1,
      },
    ]);
    expect(JSON.stringify(body)).not.toMatch(/userId|tg:|price|cost/i);
  });

  it("sozlamada o'chirilgan bo'lsa bo'sh ro'yxat", async () => {
    state.show = false;
    expect((await (await GET()).json()).testimonials).toEqual([]);
  });
});
