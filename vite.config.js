import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During `npm run dev` the Vite dev server runs on :5173 and proxies API calls
// to the local Express server on :3000. In the normal `npm start` flow everything
// is served from Express on a single port, so the proxy is only used by developers.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: { outDir: 'dist' },
})
