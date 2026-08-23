import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * STORAGE TOZALASH — XAVFSIZLIK.
 *
 * Ikki narsa tekshiriladi:
 *   1. Bazadagi biror kolleksiya o'qilmasa (masalan vaqtinchalik
 *      Firestore xatosi) — natija YUTILMAYDI, funksiya xato tashlaydi.
 *      Aks holda havolalar to'liqsiz yig'ilib, band fayllar "yetim"
 *      deb belgilanib o'chib ketishi mumkin edi.
 *   2. Yetim fayllar ulushi shubhali baland bo'lsa (havolalar
 *      to'liq yig'ilmagani belgisi) — o'chirish bloklanadi.
 */

interface MockDoc {
  id: string;
  data: Record<string, unknown>;
}

interface MockFile {
  name: string;
  metadata: { timeCreated: string; size: number };
}

const dbState = new Map<string, MockDoc[] | "FAIL">();
const storageFiles = new Map<string, MockFile[]>();
const deletedPaths = new Set<string>();

function makeQuery(source: MockDoc[] | "FAIL" | undefined, limitN = Infinity, afterId?: string) {
  return {
    orderBy() {
      return makeQuery(source, limitN, afterId);
    },
    limit(n: number) {
      return makeQuery(source, n, afterId);
    },
    startAfter(doc: { id: string }) {
      return makeQuery(source, limitN, doc.id);
    },
    async get() {
      if (source === "FAIL") throw new Error("Firestore vaqtincha ishlamayapti.");
      const sorted = [...(source ?? [])].sort((a, b) => (a.id < b.id ? -1 : 1));
      const startIdx = afterId ? sorted.findIndex((d) => d.id === afterId) + 1 : 0;
      const page = sorted.slice(startIdx, startIdx + limitN);
      return { size: page.length, docs: page.map((d) => ({ id: d.id, data: () => d.data })) };
    },
  };
}

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => makeQuery(dbState.get(name)),
  }),
  getAdminStorage: () => ({
    bucket: () => ({
      getFiles: async ({ prefix }: { prefix: string }) => [
        (storageFiles.get(prefix) ?? []).map((file) => ({
          name: file.name,
          metadata: file.metadata,
        })),
      ],
      file: (path: string) => ({
        delete: async () => {
          deletedPaths.add(path);
        },
      }),
    }),
  }),
}));

const { deleteOrphanFiles, scanOrphanFiles } = await import("./cleanup");

const OLD = new Date(Date.now() - 40 * 86_400_000).toISOString();

/** Bazadagi hujjatda shu fayl havola qilingandek ko'rinadi. */
function refUrl(path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/${encodeURIComponent(path)}?alt=media`;
}

beforeEach(() => {
  dbState.clear();
  storageFiles.clear();
  deletedPaths.clear();
  for (const name of [
    "products",
    "deletedProducts",
    "blogPosts",
    "settings",
    "metadata",
    "orders",
    "reviews",
    "stockIntakes",
    "intakeAlbums",
  ]) {
    dbState.set(name, []);
  }
});

describe("storage tozalash - qalqon", () => {
  it("hamma havola o'qilsa va yetimlar oz bo'lsa - normal ishlaydi", async () => {
    dbState.set("products", [
      { id: "p1", data: { photoUrl: refUrl("products/p1/a.jpg") } },
      { id: "p2", data: { photoUrl: refUrl("products/p2/a.jpg") } },
      { id: "p3", data: { photoUrl: refUrl("products/p3/a.jpg") } },
    ]);
    storageFiles.set("products/", [
      { name: "products/p1/a.jpg", metadata: { timeCreated: OLD, size: 100 } },
      { name: "products/p2/a.jpg", metadata: { timeCreated: OLD, size: 100 } },
      { name: "products/p3/a.jpg", metadata: { timeCreated: OLD, size: 100 } },
      { name: "products/orphan.jpg", metadata: { timeCreated: OLD, size: 50 } },
    ]);

    const report = await scanOrphanFiles();
    expect(report.suspicious).toBeUndefined();
    expect(report.orphans.map((o) => o.path)).toEqual(["products/orphan.jpg"]);

    const result = await deleteOrphanFiles();
    expect(result.deleted).toBe(1);
    expect(deletedPaths.has("products/orphan.jpg")).toBe(true);
  });

  it("kolleksiya o'qilmasa - xato tashlaydi va hech narsa o'chmaydi", async () => {
    dbState.set("products", "FAIL");
    storageFiles.set("products/", [
      { name: "products/p1/a.jpg", metadata: { timeCreated: OLD, size: 100 } },
    ]);

    await expect(scanOrphanFiles()).rejects.toThrow();
    await expect(deleteOrphanFiles()).rejects.toThrow();
    expect(deletedPaths.size).toBe(0);
  });

  it("yetimlar 40% dan oshsa - qalqon o'chirishni bloklaydi", async () => {
    // Bitta havola bor, lekin 3 tasi "yetim" - 4 tadan 3 tasi = 75%.
    dbState.set("products", [{ id: "p1", data: { photoUrl: refUrl("products/used.jpg") } }]);
    storageFiles.set("products/", [
      { name: "products/used.jpg", metadata: { timeCreated: OLD, size: 100 } },
      { name: "products/orphan1.jpg", metadata: { timeCreated: OLD, size: 50 } },
      { name: "products/orphan2.jpg", metadata: { timeCreated: OLD, size: 50 } },
      { name: "products/orphan3.jpg", metadata: { timeCreated: OLD, size: 50 } },
    ]);

    const report = await scanOrphanFiles();
    expect(report.suspicious).toMatch(/[Ss]hubhali/);

    await expect(deleteOrphanFiles()).rejects.toThrow(/[Ss]hubhali/);
    expect(deletedPaths.size).toBe(0);
  });
});
