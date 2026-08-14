import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@shared": path.join(root, "src", "shared"),
    },
  },
  test: {
    include: ["test/unit/**/*.test.ts", "test/webview/**/*.spec.ts", "test/mock-wire/**/*.test.ts"],
    environment: "node",
    environmentMatchGlobs: [["test/webview/**", "jsdom"]],
    restoreMocks: true,
    clearMocks: true,
  },
});
