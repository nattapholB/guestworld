import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative asset paths so the build works under any GitHub Pages repo subpath.
  base: './',
  plugins: [react()],
})
