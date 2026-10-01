import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Imported (not read from disk) so the dev server restarts when the version is bumped.
import pkg from './package.json'

export default defineConfig({
  // Relative asset paths so the build works under any GitHub Pages repo subpath.
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
