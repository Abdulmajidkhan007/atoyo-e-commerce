import { beforeEach, describe, expect, it, vi } from "vitest";

const pending: Array<() => Promise<void>> = [];
const track = vi.fn(async (_id: string) => {});
const rate = vi.fn(async (_p: unknown) => ({ allowed: true, remaining: 1 }));

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual, after: (fn: () => Promise<void>) => void pending.push(fn) };
});
vi.mock("@/lib/telegram/channel-stats", () => ({ trackChannelClick: (id: string) => track(id) }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (p: unknown) => rate(p),
  getClientIp: () => "203.0.113.7",
  ipLimitKey: (ip: string) => ip,
}));

import { GET } from "./route";

async function hit(id: string) {
  const res = await GET(new Request(`https://atoyo.uz/k/${id}`), { params: Promise.resolve({ id }) });
  for (const fn of pending.splice(0)) await fn();
  return res;
}

describe("/k/[id]", () => {
  beforeEach(() => {
    track.mockClear();
    rate.mockReset();
    rate.mockResolvedValue({ allowed: true, remaining: 1 });
  });

  it("mahsulot sahifasiga yo'naltiradi va sanaydi", async () => {
    const res = await hit("abc");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/mahsulot/abc");
    expect(track).toHaveBeenCalledWith("abc");
  });

  it("limitdan oshganda yozmaydi, lekin yo'naltiradi", async () => {
    rate.mockResolvedValue({ allowed: false, remaining: 0 });
    const res = await hit("abc");
    expect(res.status).toBe(302);
    expect(track).not.toHaveBeenCalled();
  });
});
