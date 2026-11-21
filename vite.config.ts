import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tanstackStart({ server: { entry: "server" } }), viteReact(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 3013,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:3001",
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 3013,
    strictPort: true,
    allowedHosts: ["jastip.103.245.38.142.sslip.io"],
  },
  resolve: { tsconfigPaths: true },
});
