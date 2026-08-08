import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Testlar - sof mantiq uchun (narx, turlar, qidiruv tokenlari,
 * kategoriya ro'yxatlari). Firebase yoki tarmoq talab qilmaydi,
 * shuning uchun CI'da bir necha soniyada o'tadi.
 *
 * `server-only` bo'sh modulga almashtiriladi: u faqat Next.js
 * build'ida "bu fayl client'ga tushmasin" degan qo'riqchi vazifasini
 * bajaradi, testda esa import qilinishi bilan xato tashlaydi. Shu
 * alias tufayli server modullarini (masalan katalog so'rovlarini)
 * ham testdan o'tkazish mumkin.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
});
