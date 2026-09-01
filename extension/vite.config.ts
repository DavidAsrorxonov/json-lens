import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import manifest from "./manifest.config.ts";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        popup: "src/popup/popup.html",
        devtools: "src/devtools/devtools.html",
        panel: "src/panel/panel.html",
      },
    },
  },
});
