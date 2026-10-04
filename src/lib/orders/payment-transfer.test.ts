import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `reviewTransferPayment` — tranzaksiya: holat QAYTA o'qiladi, allaqachon
 * to'langan buyurtma ikkinchi marta yozilmaydi (xabar/SMS ham takrorlanmaydi).
 */

let stored: Record<string, unknown> | null;
const { txUpdate, refresh, logAction } = vi.hoisted(() => ({
  txUpdate: vi.fn(),
  refresh: vi.fn(async () => {}),
  logAction: vi.fn(async () => {}),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({ doc: () => ({ id: "order12345" }) }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        get: async () => ({ exists: stored !== null, id: "order12345", data: () => stored }),
        update: (_ref: unknown, patch: Record<string, unknown>) => {
          txUpdate(patch);
          stored = { ...stored, ...patch };
        },
      }),
  }),
}));
vi.mock("@/lib/firebase/admin-storage", () => ({ deletePrivateFile: vi.fn(), savePrivateFile: vi.fn() }));
vi.mock("@/lib/telegram/bot", () => ({ sendTopicFile: vi.fn() }));
vi.mock("@/lib/telegram/keyboard", () => ({ buildPaymentReviewKeyboard: vi.fn() }));
vi.mock("@/lib/ops/report-error", () => ({ reportError: vi.fn() }));
vi.mock("./telegram-message", () => ({ refreshOrderTelegramMessage: refresh }));
vi.mock("@/lib/telegram/action-log", () => ({ logAction }));
vi.mock("@/lib/sms/sender", () => ({ isSmsConfigured: () => false, sendSms: vi.fn() }));

import { reviewTransferPayment } from "./payment-transfer";

beforeEach(() => {
  stored = { paymentMethod: "transfer", paymentStatus: "pending", totalAmount: 1000, phoneNumber: "+998901234567" };
  txUpdate.mockClear();
  refresh.mockClear();
  logAction.mockClear();
});

describe("reviewTransferPayment", () => {
  it("pul keldi: bir marta yoziladi, ikkinchi bosish yozmaydi", async () => {
    const first = await reviewTransferPayment("order12345", true, "admin");
    expect(first?.paymentStatus).toBe("paid");
    const second = await reviewTransferPayment("order12345", true, "admin");
    expect(second?.paymentStatus).toBe("paid");
    expect(txUpdate).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(logAction).toHaveBeenCalledTimes(1);
  });

  it("tasdiqlangan to'lovni 'tushmadi'ga qaytarib bo'lmaydi", async () => {
    stored = { ...stored, paymentStatus: "paid" };
    const res = await reviewTransferPayment("order12345", false, "admin");
    expect(res?.paymentStatus).toBe("paid");
    expect(txUpdate).not.toHaveBeenCalled();
  });

  it("pul tushmadi: failed yoziladi", async () => {
    const res = await reviewTransferPayment("order12345", false, "admin");
    expect(res?.paymentStatus).toBe("failed");
    expect(txUpdate).toHaveBeenCalledWith(expect.objectContaining({ paymentStatus: "failed" }));
  });

  it("naqd buyurtma o'zgarmaydi; buyurtma yo'q → null", async () => {
    stored = { ...stored, paymentMethod: "cash" };
    expect((await reviewTransferPayment("order12345", true, "a"))?.paymentStatus).toBe("pending");
    expect(txUpdate).not.toHaveBeenCalled();
    stored = null;
    expect(await reviewTransferPayment("order12345", true, "a")).toBeNull();
  });
});
