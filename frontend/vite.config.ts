import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import reactInspector from "vite-plugin-react-inspector"

export default defineConfig({
  plugins: [
    react(),
    reactInspector(), 
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:6000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})