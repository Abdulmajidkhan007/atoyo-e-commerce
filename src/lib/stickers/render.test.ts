import { describe, expect, it } from "vitest";
import { stickerPng } from "./render";
import { iconArt, logoMark } from "./art";

describe("stiker grafikasi", () => {
  it("512x512 PNG yasaydi va Telegram chegarasidan oshmaydi", async () => {
    const png = await stickerPng({
      template: "circle",
      icon: "check",
      text: "RAHMAT",
      subtitle: "ALLOH ROZI BO'LSIN",
    });
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(512);
    expect(png.readUInt32BE(20)).toBe(512);
    expect(png.length).toBeLessThan(512 * 1024);
  }, 60_000);

  it("logotip va ikonkalar SVG data URI qaytaradi", () => {
    expect(logoMark("dark")).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(iconArt("truck")).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(iconArt("yo'q-ikonka")).toBeNull();
  });
});
