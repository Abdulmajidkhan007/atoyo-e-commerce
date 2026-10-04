import { describe, expect, it } from "vitest";
import type { Review } from "@/types/review";
import { pickTestimonials, shortAuthorName } from "./testimonial-view";

const review = (id: string, patch: Partial<Review> = {}): Review => ({
  id,
  productId: "p1",
  userId: "secret-uid",
  authorName: "Abdulla Karimov",
  rating: 5,
  comment: "Zo'r kran",
  createdAt: 1,
  featured: true,
  ...patch,
});

describe("shortAuthorName", () => {
  it("familiyaning faqat bosh harfi", () => {
    expect(shortAuthorName("Abdulla Karimov")).toBe("Abdulla K.");
    expect(shortAuthorName("  Ali  ")).toBe("Ali");
    expect(shortAuthorName("")).toBe("Mijoz");
    expect(shortAuthorName(undefined)).toBe("Mijoz");
  });
});

describe("pickTestimonials", () => {
  const products = new Map([
    ["p1", { name: "Kran", isActive: true }],
    ["hidden", { name: "Yashirin", isActive: false }],
    ["draft", { name: "Chernovik", isActive: true, isDraft: true }],
  ]);

  it("faqat TANLANGAN va mahsuloti saytda bor sharhlar, eng yangisi birinchi", () => {
    const out = pickTestimonials(
      [
        review("a", { createdAt: 1 }),
        review("b", { createdAt: 3 }),
        review("c", { featured: false }),
        review("d", { productId: "hidden" }),
        review("e", { productId: "draft" }),
        review("f", { productId: "gone" }),
        review("g", { comment: "   " }),
      ],
      products,
      10
    );
    expect(out.map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("mijozning uid'i va to'liq familiyasi chiqmaydi", () => {
    const [t] = pickTestimonials([review("a")], products, 10);
    expect(JSON.stringify(t)).not.toContain("secret-uid");
    expect(t!.authorName).toBe("Abdulla K.");
    expect(t!.productName).toBe("Kran");
  });

  it("chegara va reyting 1-5 oralig'ida", () => {
    const out = pickTestimonials(
      [review("a", { rating: 9 }), review("b", { rating: 0 }), review("c")],
      products,
      2
    );
    expect(out).toHaveLength(2);
    expect(pickTestimonials([review("x", { rating: 9 })], products, 1)[0]!.rating).toBe(5);
    expect(pickTestimonials([review("y", { rating: 0 })], products, 1)[0]!.rating).toBe(1);
  });
});
