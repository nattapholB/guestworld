import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
// Imported (not read from disk) so the dev server restarts when the version is bumped.
import pkg from './package.json'

export default defineConfig({
  // Relative asset paths so the build works under any GitHub Pages repo subpath.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Registration is managed by useRegisterSW in PwaUpdateToast.tsx to avoid double registration.
      injectRegister: false,
      // Public icons are already precached via workbox.globPatterns; skip duplicate manifest/asset injection.
      includeManifestIcons: false,
      manifestFilename: 'manifest.webmanifest',
      manifest: {
        id: './',
        name: 'GuestWorld',
        short_name: 'GuestWorld',
        description:
          'A little space to think. Play Orbit Word, Sudoku, and Crossword offline in GuestWorld.',
        theme_color: '#05061a',
        background_color: '#05061a',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        categories: ['games', 'puzzle'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,woff,woff2,txt}'],
        // Ensure the lazy 3D Scene chunk (~1.01 MB) is precached for offline play.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Relative to base: './' so GitHub Pages subpath navigation resolves to the precached shell.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
