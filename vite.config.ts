import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/acougue-digital-mvp/" : "/",
  build: { outDir: mode === "pages" ? "dist-pages" : "dist" },
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    proxy:
      mode === "pages"
        ? undefined
        : {
            "/api": { target: "http://127.0.0.1:3001", changeOrigin: false },
            "/fotos": { target: "http://127.0.0.1:3001", changeOrigin: false },
          },
  },
}));
