import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    globalSetup: "./src/__tests__/globalSetup.js",
    setupFiles: "./src/__tests__/setup.js",
    fileParallelism: false,  // single Atlas connection — no concurrent test files
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: ["src/__tests__/**", "src/utils/seedData.js"],
    },
  },
});
