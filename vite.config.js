import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
export default defineConfig({
  plugins: [vue()],
  base: "./",
  server: { host: "127.0.0.1", proxy: { "/api": "http://127.0.0.1:8787" } },
  // 開發伺服器設定
  server: {
    port: 5179,
    strictPort: true, // 被占用時直接提示，避免自動換到其他 port
  },
});
