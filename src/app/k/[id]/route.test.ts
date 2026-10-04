import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn(async (_id: string, _name?: string) => {});
let productName: string | null | undefined = "Kran";
let clientIp = "203.0.113.7";
const rate = vi.fn(async (_p: unknown) => ({ allowed: true, remaining: 1 }));

vi.mock("@/lib/telegram/channel-stats", () => ({
  trackChannelClick: (id: string, name?: string) => track(id, name),
  channelProductName: async () => productName,
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (p: unknown) => rate(p),
  getClientIp: () => clientIp,
  ipLimitKey: (ip: string) => ip,
}));

import { GET } from "./route";

async function hit(id: string) {
  return GET(new Request(`https://atoyo.uz/k/${id}`), { params: Promise.resolve({ id }) });
}

describe("/k/[id]", () => {
  beforeEach(() => {
    track.mockClear();
    rate.mockReset();
    rate.mockResolvedValue({ allowed: true, remaining: 1 });
    productName = "Kran";
    clientIp = "203.0.113.7";
  });

  it("mahsulot sahifasiga yo'naltiradi va sanaydi", async () => {
    const res = await hit("abc");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/mahsulot/abc");
    expect(track).toHaveBeenCalledWith("abc", "Kran");
  });

  it("notanish ID — bosh sahifaga, hech narsa yozilmaydi", async () => {
    productName = null;
    const res = await hit("yoq");
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
    expect(track).not.toHaveBeenCalled();
    expect(rate).not.toHaveBeenCalled();
  });

  it("IP o'qilmasa limit qo'llanmaydi (umumiy chelak yo'q)", async () => {
    clientIp = "unknown";
    await hit("abc");
    expect(rate).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalled();
  });

  it("limitdan oshganda yozmaydi, lekin yo'naltiradi", async () => {
    rate.mockResolvedValue({ allowed: false, remaining: 0 });
    const res = await hit("abc");
    expect(res.status).toBe(302);
    expect(track).not.toHaveBeenCalled();
  });
});
