import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Testlar - sof mantiq uchun (narx, turlar, qidiruv tokenlari,
 * kategoriya ro'yxatlari). Firebase yoki tarmoq talab qilmaydi,
 * shuning uchun CI'da bir necha soniyada o'tadi.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
