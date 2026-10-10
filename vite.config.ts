import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-icon.svg', 'pwa-icon-192.png', 'pwa-icon-512.png', 'pwa-icon-maskable-512.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Magomano SACCO',
        short_name: 'Magomano',
        description: 'Manage your Magomano SACCO savings, loans, and member account.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f3f6ee',
        theme_color: '#153d3a',
        categories: ['finance', 'business'],
        icons: [
          { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8788',
    },
  },
})
