import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase SDK is large and changes rarely — split it out so it caches
          // independently of app code across releases.
          firebase: [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/functions",
            "firebase/storage",
          ],
          // React + router are also long-lived — same caching argument.
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
