import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 5173,
    allowedHosts: true, // lets a VS Code / tunnel https hostname reach the dev server (local testing only)
    headers: { "Cross-Origin-Opener-Policy": "same-origin-allow-popups" },
    // the Worker (wrangler dev) serves /api; same-origin keeps the session cookies working
    proxy: { "/api": { target: "http://localhost:8787", changeOrigin: false, ws: false } },
  },
  // `npm run preview:lan` for phone testing; allowedHosts lets an https tunnel hostname through (local testing only).
  preview: { port: 4173, host: true, allowedHosts: true },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          forms: ["react-hook-form", "zod", "@hookform/resolvers"],
        },
      },
    },
  },
});
