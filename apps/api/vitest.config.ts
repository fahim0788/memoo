import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@memolist/db": new URL("./src/__tests__/__mocks__/db.ts", import.meta.url).pathname,
    },
  },
});
