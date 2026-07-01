import { defineConfig } from 'vite'

// base: './' keeps the production build portable so it also opens from a
// file:// path, our offline exam-room fallback. Fixed strict port so the
// preview launch config is predictable.
export default defineConfig({
  base: './',
  server: { port: 4321, strictPort: true },
  build: { outDir: 'dist' },
})
