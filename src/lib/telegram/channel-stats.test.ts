import { beforeEach, describe, expect, it, vi } from "vitest";

const set = vi.fn(async () => {});
let exists = true;

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => ({
      doc: () =>
        name === "products"
          ? { get: async () => ({ exists, data: () => ({ name: "Kran" }) }) }
          : { set },
    }),
  }),
}));

import { trackChannelClick } from "./channel-stats";

describe("trackChannelClick", () => {
  beforeEach(() => set.mockClear());

  it("notanish ID ga yozmaydi", async () => {
    exists = false;
    await trackChannelClick("yoq");
    expect(set).not.toHaveBeenCalled();
  });

  it("mavjud mahsulotga yozadi", async () => {
    exists = true;
    await trackChannelClick("bor");
    expect(set).toHaveBeenCalledTimes(1);
  });
});
