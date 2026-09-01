import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "JSON Lens",
  description: "Inspect JSON documents and JSON network responses in Chrome.",
  version: "0.1.0",
  permissions: ["storage"],
  host_permissions: ["<all_urls>"],
  action: {
    default_title: "JSON Lens",
    default_popup: "src/popup/popup.html",
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  devtools_page: "src/devtools/devtools.html",
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/json-detector.ts"],
      run_at: "document_start",
    },
  ],
});
