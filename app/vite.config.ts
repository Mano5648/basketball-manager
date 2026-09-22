import path from "path"
import { readFileSync } from "fs"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version: string }

export default defineConfig({
  // Relative base: works on GitHub Pages sub-paths AND inside the Capacitor
  // native shell (file/asset served from app bundle). HashRouter means no
  // server-side routing is required.
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
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
