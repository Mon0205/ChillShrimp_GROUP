import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  server: {
    port: 5173,
    watch: { usePolling: process.env.VITE_USE_POLLING === 'true' },
    proxy: process.env.VITE_PROXY_TARGET
      ? { '/api': { target: process.env.VITE_PROXY_TARGET, changeOrigin: true } }
      : undefined,
  },
})
