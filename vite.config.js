import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standard Vite + React setup. Nothing exotic here on purpose —
// keep the build config boring so it's easy to explain in eval.
export default defineConfig({
  plugins: [react()],
})
