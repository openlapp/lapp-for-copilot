import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "..");

export default defineConfig({
  root: dir,
  base: "./",
  plugins: [vue()],
  resolve: {
    alias: {
      "@shared": path.join(root, "src", "shared"),
    },
  },
  build: {
    outDir: path.join(root, "dist", "webview"),
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.join(dir, "index.html"),
      output: {
        entryFileNames: "assets/index.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
