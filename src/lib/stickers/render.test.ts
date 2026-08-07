import { describe, expect, it } from "vitest";
import { stickerPng } from "./render";

describe("stickerPng", () => {
  it("512x512 PNG yasaydi va Telegram chegarasidan oshmaydi", async () => {
    const png = await stickerPng({ template: "circle", text: "RAHMAT", subtitle: "ALLOH ROZI BO'LSIN" });
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(512);
    expect(png.readUInt32BE(20)).toBe(512);
    expect(png.length).toBeLessThan(512 * 1024);
  }, 60_000);
});
