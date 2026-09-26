import { describe, expect, it } from "vitest";
import { detectReceiptType } from "./receipt";

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);

describe("detectReceiptType", () => {
  it("JPEG, PNG, WebP va PDF ni baytlaridan taniydi", () => {
    expect(detectReceiptType(bytes(0xff, 0xd8, 0xff, 0xe0))?.contentType).toBe("image/jpeg");
    expect(detectReceiptType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.ext).toBe("png");
    expect(
      detectReceiptType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))?.contentType
    ).toBe("image/webp");
    expect(detectReceiptType(new TextEncoder().encode("%PDF-1.7 ....."))?.ext).toBe("pdf");
  });

  it("nomi .jpg bo'lsa ham ichi HTML/skript bo'lsa — rad etiladi", () => {
    expect(detectReceiptType(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectReceiptType(new TextEncoder().encode("GIF89a........"))).toBeNull();
  });

  it("juda qisqa fayl rad etiladi", () => {
    expect(detectReceiptType(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
  });
});
