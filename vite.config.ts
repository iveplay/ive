import path from 'path'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import manifest from './manifest.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr({ include: '**/*.svg' }), crx({ manifest })],
  legacy: {
    skipWebSocketTokenCheck: true,
  },
  build: {
    rollupOptions: {
      // Exclude the buttplug-wasm package from the bundle
      // extension popup cannot use it
      // the package is also >4mb which is too large for firefox extension
      external: ['buttplug-wasm', 'buttplug-wasm/dist/buttplug-wasm.mjs'],
    },
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@popup': path.resolve(__dirname, './popup'),
      '@background': path.resolve(__dirname, './background'),
      '@content': path.resolve(__dirname, './content'),
    },
  },
})
