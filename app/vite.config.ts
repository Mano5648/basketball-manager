import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  // Relative base so the built site works no matter what path GitHub Pages serves
  // it from (e.g. username.github.io/<repo>/ OR a custom domain at root) without
  // hardcoding the repo name. Safe because the app uses HashRouter (no server-side
  // routing). The dev server overrides this with `--base /` (see supervisor).
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    hmr: { clientPort: 443 },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
